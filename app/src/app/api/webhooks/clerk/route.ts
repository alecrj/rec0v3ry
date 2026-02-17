import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/server/db/client';
import { users, userSessions } from '@/server/db/schema/users';
import { eq } from 'drizzle-orm';

/**
 * Clerk Webhook Handler
 *
 * Syncs Clerk authentication events to local database.
 * Source: Sprint 3-4 integration requirements
 *
 * Events handled:
 * - user.created: Create user record
 * - user.updated: Update user record
 * - user.deleted: Soft delete user
 * - session.created: Log session start
 * - session.ended: Log session end
 */
export async function POST(req: Request) {
  try {
    const headersList = await headers();

    // TODO: Install svix package and verify webhook signature (compliance finding F6)
    // const svixId = headersList.get('svix-id');
    // const svixTimestamp = headersList.get('svix-timestamp');
    // const svixSignature = headersList.get('svix-signature');
    //
    // if (!svixId || !svixTimestamp || !svixSignature) {
    //   return NextResponse.json({ error: 'Missing signature headers' }, { status: 400 });
    // }
    //
    // const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    // if (!webhookSecret) {
    //   throw new Error('CLERK_WEBHOOK_SECRET not configured');
    // }
    //
    // const wh = new Webhook(webhookSecret);
    // const payload = await req.text();
    // const evt = wh.verify(payload, {
    //   'svix-id': svixId,
    //   'svix-timestamp': svixTimestamp,
    //   'svix-signature': svixSignature,
    // });

    const body = await req.json();
    const { type, data } = body;

    console.log('[Clerk Webhook]', type);

    switch (type) {
      case 'user.created': {
        // Map Clerk user to our schema
        await db.insert(users).values({
          clerk_id: data.id,
          email: data.email_addresses[0]?.email_address || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone_numbers[0]?.phone_number || null,
          profile_photo_url: data.image_url || null,
          is_active: true,
          last_login_at: new Date(),
        });
        console.log('[Clerk Webhook] User created:', data.id);
        break;
      }

      case 'user.updated': {
        // Update existing user by clerk_id
        await db
          .update(users)
          .set({
            email: data.email_addresses[0]?.email_address || '',
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            phone: data.phone_numbers[0]?.phone_number || null,
            profile_photo_url: data.image_url || null,
            updated_at: new Date(),
          })
          .where(eq(users.clerk_id, data.id));
        console.log('[Clerk Webhook] User updated:', data.id);
        break;
      }

      case 'user.deleted': {
        // Soft delete user
        await db
          .update(users)
          .set({
            deleted_at: new Date(),
            is_active: false,
          })
          .where(eq(users.clerk_id, data.id));
        console.log('[Clerk Webhook] User deleted:', data.id);
        break;
      }

      case 'session.created': {
        // Find user by clerk_id
        const [user] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.clerk_id, data.user_id))
          .limit(1);

        if (user) {
          // Log session creation
          await db.insert(userSessions).values({
            user_id: user.id,
            ip_address: data.last_active_ip_address || null,
            user_agent: data.user_agent || null,
            started_at: new Date(data.created_at),
            last_active: new Date(data.last_active_at),
            expires_at: new Date(data.expire_at),
          });
          console.log('[Clerk Webhook] Session created for user:', data.user_id);
        }
        break;
      }

      case 'session.ended': {
        // Find user by clerk_id
        const [user] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.clerk_id, data.user_id))
          .limit(1);

        if (user) {
          // Update most recent active session
          const [session] = await db
            .select({ id: userSessions.id })
            .from(userSessions)
            .where(eq(userSessions.user_id, user.id))
            .orderBy(userSessions.started_at)
            .limit(1);

          if (session) {
            await db
              .update(userSessions)
              .set({
                ended_at: new Date(data.ended_at || Date.now()),
                end_reason: data.abandoned ? 'timeout' : 'logout',
              })
              .where(eq(userSessions.id, session.id));
            console.log('[Clerk Webhook] Session ended for user:', data.user_id);
          }
        }
        break;
      }

      default:
        console.log('[Clerk Webhook] Unhandled event type:', type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Clerk Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
