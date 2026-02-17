/**
 * Document Versioning Helper
 *
 * Manages document versions — each edit creates a new version
 * with the previous file preserved in S3.
 *
 * Architecture: docs/03_DATA_MODEL.md (documentVersions table)
 */

import { db } from '@/server/db/client';
import { documents } from '@/server/db/schema/documents';
import { documentVersions } from '@/server/db/schema/documents-extended';
import { eq, desc, sql } from 'drizzle-orm';

/**
 * Create a new version of a document
 *
 * Call this BEFORE updating the document's file_url so the
 * previous version is preserved with the old URL.
 */
export async function createDocumentVersion(params: {
  documentId: string;
  orgId: string;
  newFileUrl: string;
  changesSummary: string;
  createdBy: string;
}): Promise<{ versionNumber: number }> {
  // Get current max version number
  const [latest] = await db
    .select({ maxVersion: sql<number>`COALESCE(MAX(${documentVersions.version_number}), 0)` })
    .from(documentVersions)
    .where(eq(documentVersions.document_id, params.documentId));

  const nextVersion = (latest?.maxVersion ?? 0) + 1;

  await db.insert(documentVersions).values({
    org_id: params.orgId,
    document_id: params.documentId,
    version_number: nextVersion,
    file_url: params.newFileUrl,
    changes_summary: params.changesSummary,
    created_by: params.createdBy,
  });

  return { versionNumber: nextVersion };
}

/**
 * Get version history for a document
 */
export async function getDocumentVersions(
  documentId: string
): Promise<{
  id: string;
  versionNumber: number;
  fileUrl: string | null;
  changesSummary: string | null;
  createdBy: string | null;
  createdAt: Date;
}[]> {
  const versions = await db.query.documentVersions.findMany({
    where: eq(documentVersions.document_id, documentId),
    orderBy: [desc(documentVersions.version_number)],
  });

  return versions.map((v) => ({
    id: v.id,
    versionNumber: v.version_number,
    fileUrl: v.file_url,
    changesSummary: v.changes_summary,
    createdBy: v.created_by,
    createdAt: v.created_at,
  }));
}

/**
 * Get a specific version of a document
 */
export async function getDocumentVersion(
  documentId: string,
  versionNumber: number
): Promise<{
  id: string;
  fileUrl: string | null;
  changesSummary: string | null;
  createdBy: string | null;
  createdAt: Date;
} | null> {
  const version = await db.query.documentVersions.findFirst({
    where: (dv, { and, eq: eq_ }) =>
      and(eq_(dv.document_id, documentId), eq_(dv.version_number, versionNumber)),
  });

  if (!version) return null;

  return {
    id: version.id,
    fileUrl: version.file_url,
    changesSummary: version.changes_summary,
    createdBy: version.created_by,
    createdAt: version.created_at,
  };
}
