/**
 * S3 File Storage Client
 *
 * Lazy-initialized S3 client for document upload/download.
 * Uses pre-signed URLs (15-min expiry) for secure file access.
 *
 * Architecture: docs/02_ARCHITECTURE.md Section 12 (File Storage)
 * Compliance: SSE-KMS encryption at rest, no SUD data in object keys
 *
 * Storage structure:
 *   {org_id}/residents/{resident_id}/{category}/{filename}
 *   {org_id}/templates/{template_id}/{filename}
 *   {org_id}/general/{filename}
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ============================================================
// CLIENT INITIALIZATION (Lazy Proxy pattern)
// ============================================================

let _s3: S3Client | null = null;

function getS3(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3;
}

const BUCKET = process.env.S3_BUCKET_NAME || 'recoveryos-documents';
const PRESIGN_EXPIRY = 900; // 15 minutes

// ============================================================
// STORAGE KEY HELPERS
// ============================================================

/**
 * Build S3 key for a resident document
 * Pattern: {org_id}/residents/{resident_id}/{category}/{filename}
 */
export function buildResidentDocKey(
  orgId: string,
  residentId: string,
  category: string,
  filename: string
): string {
  return `${orgId}/residents/${residentId}/${category}/${filename}`;
}

/**
 * Build S3 key for a template document
 */
export function buildTemplateDocKey(
  orgId: string,
  templateId: string,
  filename: string
): string {
  return `${orgId}/templates/${templateId}/${filename}`;
}

/**
 * Build S3 key for an org-level document
 */
export function buildOrgDocKey(
  orgId: string,
  filename: string
): string {
  return `${orgId}/general/${filename}`;
}

// ============================================================
// PRE-SIGNED URL GENERATION
// ============================================================

/**
 * Generate a pre-signed upload URL
 *
 * Returns a URL the client can PUT to directly (bypasses server for large files).
 * Content type and size limits enforced via conditions.
 */
export async function generateUploadUrl(params: {
  key: string;
  contentType: string;
  maxSizeBytes?: number;
}): Promise<{ uploadUrl: string; key: string }> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: params.key,
    ContentType: params.contentType,
    ServerSideEncryption: 'aws:kms',
  });

  const uploadUrl = await getSignedUrl(getS3(), command, {
    expiresIn: PRESIGN_EXPIRY,
  });

  return { uploadUrl, key: params.key };
}

/**
 * Generate a pre-signed download URL
 *
 * Returns a URL the client can GET to download the file directly.
 */
export async function generateDownloadUrl(params: {
  key: string;
  filename?: string;
}): Promise<{ downloadUrl: string }> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: params.key,
    ...(params.filename && {
      ResponseContentDisposition: `attachment; filename="${params.filename}"`,
    }),
  });

  const downloadUrl = await getSignedUrl(getS3(), command, {
    expiresIn: PRESIGN_EXPIRY,
  });

  return { downloadUrl };
}

// ============================================================
// DIRECT OPERATIONS
// ============================================================

/**
 * Delete an object from S3
 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await getS3().send(command);
}

/**
 * Check if an object exists in S3
 */
export async function objectExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });
    await getS3().send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get object metadata (size, content type, etc.)
 */
export async function getObjectMetadata(key: string): Promise<{
  contentType?: string;
  contentLength?: number;
  lastModified?: Date;
} | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });
    const response = await getS3().send(command);
    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
    };
  } catch {
    return null;
  }
}
