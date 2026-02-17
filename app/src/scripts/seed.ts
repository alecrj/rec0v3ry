/**
 * Database Seed Script
 *
 * Creates realistic development seed data for RecoveryOS.
 * Run: npx tsx src/scripts/seed.ts
 * Clean and reseed: npx tsx src/scripts/seed.ts --clean
 */

import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../server/db/schema';
import { generateHMAC } from '../lib/encryption';
import crypto from 'crypto';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not found in environment');
  }

  const sql = neon(connectionString);
  const db = drizzle(sql, { schema });

  console.log('🌱 Starting seed...');

  // Check for --clean flag
  if (process.argv.includes('--clean')) {
    console.log('🧹 Cleaning existing data...');
    await cleanDatabase(db);
  }

  // 1. Organization
  console.log('Creating organization...');
  const [org] = await db.insert(schema.organizations).values({
    name: 'Hope Valley Recovery Homes',
    slug: 'hope-valley',
    settings: {
      timezone: 'America/Chicago',
      currency: 'USD',
    },
  }).returning();

  // 2. Properties
  console.log('Creating properties...');
  const [sunriseCampus, lakesideCampus] = await db.insert(schema.properties).values([
    {
      org_id: org.id,
      name: 'Sunrise Campus',
      address_line1: '123 Recovery Rd',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      phone: '512-555-0100',
      email: 'sunrise@hopevalley.org',
    },
    {
      org_id: org.id,
      name: 'Lakeside Campus',
      address_line1: '456 Serenity Ln',
      city: 'Austin',
      state: 'TX',
      zip: '78702',
      phone: '512-555-0200',
      email: 'lakeside@hopevalley.org',
    },
  ]).returning();

  // 3. Houses
  console.log('Creating houses...');
  const houseData = [
    {
      org_id: org.id,
      property_id: sunriseCampus.id,
      name: "Sunrise Men's House",
      capacity: 8,
      gender_restriction: 'male',
      address_line1: sunriseCampus.address_line1,
      city: sunriseCampus.city,
      state: sunriseCampus.state,
      zip: sunriseCampus.zip,
    },
    {
      org_id: org.id,
      property_id: sunriseCampus.id,
      name: "Sunrise Women's House",
      capacity: 6,
      gender_restriction: 'female',
      address_line1: sunriseCampus.address_line1,
      city: sunriseCampus.city,
      state: sunriseCampus.state,
      zip: sunriseCampus.zip,
    },
    {
      org_id: org.id,
      property_id: lakesideCampus.id,
      name: "Lakeside Men's House",
      capacity: 10,
      gender_restriction: 'male',
      address_line1: lakesideCampus.address_line1,
      city: lakesideCampus.city,
      state: lakesideCampus.state,
      zip: lakesideCampus.zip,
    },
    {
      org_id: org.id,
      property_id: lakesideCampus.id,
      name: 'Lakeside Coed House',
      capacity: 8,
      gender_restriction: 'coed',
      address_line1: lakesideCampus.address_line1,
      city: lakesideCampus.city,
      state: lakesideCampus.state,
      zip: lakesideCampus.zip,
    },
  ];
  const houses = await db.insert(schema.houses).values(houseData).returning();

  // 4. Rooms (2-3 per house)
  console.log('Creating rooms...');
  const roomsData = [];
  for (const house of houses) {
    const roomCount = house.capacity <= 6 ? 2 : 3;
    for (let i = 1; i <= roomCount; i++) {
      roomsData.push({
        org_id: org.id,
        house_id: house.id,
        name: `Room ${i}`,
        floor: i <= 2 ? 1 : 2,
        capacity: Math.floor(house.capacity / roomCount),
      });
    }
  }
  const rooms = await db.insert(schema.rooms).values(roomsData).returning();

  // 5. Beds
  console.log('Creating beds...');
  const bedsData = [];
  const bedStatuses = ['available', 'available', 'available', 'occupied', 'occupied', 'maintenance'];
  let bedStatusIndex = 0;
  for (const room of rooms) {
    for (let i = 1; i <= room.capacity; i++) {
      bedsData.push({
        org_id: org.id,
        room_id: room.id,
        name: `Bed ${String.fromCharCode(64 + i)}`, // A, B, C, etc.
        status: bedStatuses[bedStatusIndex % bedStatuses.length] as 'available' | 'occupied' | 'maintenance',
      });
      bedStatusIndex++;
    }
  }
  const beds = await db.insert(schema.beds).values(bedsData).returning();

  // 6. Users
  console.log('Creating users...');
  const usersData = [
    {
      clerk_id: `clerk_${crypto.randomUUID()}`,
      email: 'sarah@hopevalley.org',
      first_name: 'Sarah',
      last_name: 'Johnson',
      phone: '512-555-1001',
      is_active: true,
    },
    {
      clerk_id: `clerk_${crypto.randomUUID()}`,
      email: 'mike@hopevalley.org',
      first_name: 'Mike',
      last_name: 'Chen',
      phone: '512-555-1002',
      is_active: true,
    },
    {
      clerk_id: `clerk_${crypto.randomUUID()}`,
      email: 'lisa@hopevalley.org',
      first_name: 'Lisa',
      last_name: 'Rodriguez',
      phone: '512-555-1003',
      is_active: true,
    },
    {
      clerk_id: `clerk_${crypto.randomUUID()}`,
      email: 'james@hopevalley.org',
      first_name: 'James',
      last_name: 'Wilson',
      phone: '512-555-1004',
      is_active: true,
    },
    {
      clerk_id: `clerk_${crypto.randomUUID()}`,
      email: 'amy@hopevalley.org',
      first_name: 'Amy',
      last_name: 'Park',
      phone: '512-555-1005',
      is_active: true,
    },
    {
      clerk_id: `clerk_${crypto.randomUUID()}`,
      email: 'david@hopevalley.org',
      first_name: 'David',
      last_name: 'Brown',
      phone: '512-555-1006',
      is_active: true,
    },
    {
      clerk_id: `clerk_${crypto.randomUUID()}`,
      email: 'emily@hopevalley.org',
      first_name: 'Emily',
      last_name: 'Taylor',
      phone: '512-555-1007',
      is_active: true,
    },
  ];
  const createdUsers = await db.insert(schema.users).values(usersData).returning();

  // 7. Role Assignments
  console.log('Creating role assignments...');
  const roleAssignmentsData = [
    {
      org_id: org.id,
      user_id: createdUsers[0].id,
      role: 'org_owner' as const,
      scope_type: 'organization',
      scope_id: org.id,
    },
    {
      org_id: org.id,
      user_id: createdUsers[1].id,
      role: 'org_owner' as const,
      scope_type: 'organization',
      scope_id: org.id,
    },
    {
      org_id: org.id,
      user_id: createdUsers[2].id,
      role: 'property_manager' as const,
      scope_type: 'property',
      scope_id: sunriseCampus.id,
    },
    {
      org_id: org.id,
      user_id: createdUsers[3].id,
      role: 'house_manager' as const,
      scope_type: 'house',
      scope_id: houses[0].id,
    },
    {
      org_id: org.id,
      user_id: createdUsers[4].id,
      role: 'house_manager' as const,
      scope_type: 'house',
      scope_id: houses[2].id,
    },
    {
      org_id: org.id,
      user_id: createdUsers[5].id,
      role: 'staff' as const,
      scope_type: 'organization',
      scope_id: org.id,
    },
    {
      org_id: org.id,
      user_id: createdUsers[6].id,
      role: 'staff' as const,
      scope_type: 'organization',
      scope_id: org.id,
    },
  ];
  await db.insert(schema.roleAssignments).values(roleAssignmentsData);

  // 8. Residents
  console.log('Creating residents...');
  const residentsData = [
    {
      org_id: org.id,
      first_name: 'ENCRYPTED:John',
      last_name: 'ENCRYPTED:Smith',
      date_of_birth: '1990-05-15',
      email: 'ENCRYPTED:john.smith@email.com',
      phone: 'ENCRYPTED:512-555-2001',
      emergency_contact_name: 'ENCRYPTED:Mary Smith',
      emergency_contact_phone: 'ENCRYPTED:512-555-2002',
      emergency_contact_relationship: 'Mother',
      sensitivity_level: 'part2_protected' as const,
    },
    {
      org_id: org.id,
      first_name: 'ENCRYPTED:Maria',
      last_name: 'ENCRYPTED:Garcia',
      date_of_birth: '1988-08-22',
      email: 'ENCRYPTED:maria.garcia@email.com',
      phone: 'ENCRYPTED:512-555-2003',
      emergency_contact_name: 'ENCRYPTED:Carlos Garcia',
      emergency_contact_phone: 'ENCRYPTED:512-555-2004',
      emergency_contact_relationship: 'Spouse',
      sensitivity_level: 'part2_protected' as const,
    },
    {
      org_id: org.id,
      first_name: 'ENCRYPTED:Michael',
      last_name: 'ENCRYPTED:Thompson',
      date_of_birth: '1995-03-10',
      email: 'ENCRYPTED:michael.thompson@email.com',
      phone: 'ENCRYPTED:512-555-2005',
      emergency_contact_name: 'ENCRYPTED:Susan Thompson',
      emergency_contact_phone: 'ENCRYPTED:512-555-2006',
      emergency_contact_relationship: 'Mother',
      sensitivity_level: 'part2_protected' as const,
    },
    {
      org_id: org.id,
      first_name: 'ENCRYPTED:Jennifer',
      last_name: 'ENCRYPTED:Lee',
      date_of_birth: '1992-11-30',
      email: 'ENCRYPTED:jennifer.lee@email.com',
      phone: 'ENCRYPTED:512-555-2007',
      sensitivity_level: 'part2_protected' as const,
    },
    {
      org_id: org.id,
      first_name: 'ENCRYPTED:Robert',
      last_name: 'ENCRYPTED:Martinez',
      date_of_birth: '1985-07-18',
      email: 'ENCRYPTED:robert.martinez@email.com',
      phone: 'ENCRYPTED:512-555-2008',
      sensitivity_level: 'part2_protected' as const,
    },
    {
      org_id: org.id,
      first_name: 'ENCRYPTED:Amanda',
      last_name: 'ENCRYPTED:Davis',
      date_of_birth: '1993-12-05',
      email: 'ENCRYPTED:amanda.davis@email.com',
      phone: 'ENCRYPTED:512-555-2009',
      sensitivity_level: 'part2_protected' as const,
    },
  ];
  const residents = await db.insert(schema.residents).values(residentsData).returning();

  // 9. Admissions
  console.log('Creating admissions...');
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setMonth(now.getMonth() - 2);
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(now.getMonth() - 1);

  const occupiedBeds = beds.filter(b => b.status === 'occupied');

  const admissionsData = [
    {
      org_id: org.id,
      resident_id: residents[0].id,
      house_id: houses[0].id,
      bed_id: occupiedBeds[0]?.id,
      status: 'active' as const,
      admission_date: threeMonthsAgo.toISOString().split('T')[0],
      case_manager_id: createdUsers[3].id,
    },
    {
      org_id: org.id,
      resident_id: residents[1].id,
      house_id: houses[1].id,
      bed_id: occupiedBeds[1]?.id,
      status: 'active' as const,
      admission_date: twoMonthsAgo.toISOString().split('T')[0],
      case_manager_id: createdUsers[3].id,
    },
    {
      org_id: org.id,
      resident_id: residents[2].id,
      house_id: houses[2].id,
      bed_id: occupiedBeds[2]?.id,
      status: 'active' as const,
      admission_date: oneMonthAgo.toISOString().split('T')[0],
      case_manager_id: createdUsers[4].id,
    },
    {
      org_id: org.id,
      resident_id: residents[3].id,
      house_id: houses[3].id,
      bed_id: occupiedBeds[3]?.id,
      status: 'active' as const,
      admission_date: oneMonthAgo.toISOString().split('T')[0],
      case_manager_id: createdUsers[4].id,
    },
    {
      org_id: org.id,
      resident_id: residents[4].id,
      house_id: houses[0].id,
      status: 'pending' as const,
      admission_date: now.toISOString().split('T')[0],
      case_manager_id: createdUsers[3].id,
    },
    {
      org_id: org.id,
      resident_id: residents[5].id,
      house_id: houses[1].id,
      status: 'completed' as const,
      admission_date: threeMonthsAgo.toISOString().split('T')[0],
      actual_discharge_date: oneMonthAgo.toISOString().split('T')[0],
      discharge_reason: 'Completed program successfully',
    },
  ];
  await db.insert(schema.admissions).values(admissionsData);

  // 10. Consents
  console.log('Creating consents...');
  const sixMonthsFromNow = new Date(now);
  sixMonthsFromNow.setMonth(now.getMonth() + 6);
  const oneMonthAgoDate = new Date(now);
  oneMonthAgoDate.setMonth(now.getMonth() - 1);

  const consentsData = [
    {
      org_id: org.id,
      resident_id: residents[0].id,
      consent_type: 'general_disclosure' as const,
      status: 'active' as const,
      granted_at: threeMonthsAgo,
      expires_at: sixMonthsFromNow,
      purpose: 'Share treatment information with family',
      recipient_name: 'ENCRYPTED:Mary Smith',
      recipient_organization: 'ENCRYPTED:Family Member',
      scope_of_information: 'Treatment progress, attendance',
      consent_form_signed: true,
      signature_date: threeMonthsAgo.toISOString().split('T')[0],
    },
    {
      org_id: org.id,
      resident_id: residents[1].id,
      consent_type: 'treatment' as const,
      status: 'active' as const,
      granted_at: twoMonthsAgo,
      expires_at: sixMonthsFromNow,
      purpose: 'Coordination of care with outpatient provider',
      recipient_name: 'ENCRYPTED:Dr. James Anderson',
      recipient_organization: 'ENCRYPTED:Austin Recovery Clinic',
      scope_of_information: 'Drug test results, attendance, progress notes',
      consent_form_signed: true,
      signature_date: twoMonthsAgo.toISOString().split('T')[0],
    },
    {
      org_id: org.id,
      resident_id: residents[2].id,
      consent_type: 'general_disclosure' as const,
      status: 'active' as const,
      granted_at: oneMonthAgo,
      expires_at: sixMonthsFromNow,
      purpose: 'Employment verification',
      recipient_name: 'ENCRYPTED:Tech Solutions Inc',
      scope_of_information: 'Admission dates, current status',
      consent_form_signed: true,
      signature_date: oneMonthAgo.toISOString().split('T')[0],
    },
    {
      org_id: org.id,
      resident_id: residents[5].id,
      consent_type: 'general_disclosure' as const,
      status: 'expired' as const,
      granted_at: threeMonthsAgo,
      expires_at: oneMonthAgoDate,
      purpose: 'Share information with probation officer',
      recipient_name: 'ENCRYPTED:Officer Williams',
      recipient_organization: 'ENCRYPTED:Travis County Probation',
      scope_of_information: 'Attendance, drug test results',
      consent_form_signed: true,
      signature_date: threeMonthsAgo.toISOString().split('T')[0],
    },
  ];
  await db.insert(schema.consents).values(consentsData);

  // 11. Audit Logs (with hash chain)
  console.log('Creating audit logs...');
  const hmacKey = process.env.MASTER_ENCRYPTION_KEY || 'dev-hmac-key';
  let previousHash = '';

  const auditLogsData = [
    {
      org_id: org.id,
      actor_user_id: createdUsers[0].id,
      actor_type: 'user',
      actor_ip_address: '192.168.1.100',
      action: 'login_success',
      resource_type: 'user',
      resource_id: createdUsers[0].id,
      description: 'Sarah Johnson logged in successfully',
      sensitivity_level: 'operational',
    },
    {
      org_id: org.id,
      actor_user_id: createdUsers[0].id,
      actor_type: 'user',
      action: 'resident_created',
      resource_type: 'resident',
      resource_id: residents[0].id,
      description: 'Created resident record',
      sensitivity_level: 'part2_protected',
    },
    {
      org_id: org.id,
      actor_user_id: createdUsers[3].id,
      actor_type: 'user',
      action: 'consent_created',
      resource_type: 'consent',
      description: 'Created consent for resident',
      sensitivity_level: 'part2_protected',
    },
    {
      org_id: org.id,
      actor_user_id: createdUsers[1].id,
      actor_type: 'user',
      action: 'resident_viewed',
      resource_type: 'resident',
      resource_id: residents[0].id,
      description: 'Viewed resident profile',
      sensitivity_level: 'part2_protected',
    },
    {
      org_id: org.id,
      actor_user_id: createdUsers[2].id,
      actor_type: 'user',
      action: 'login_success',
      resource_type: 'user',
      resource_id: createdUsers[2].id,
      description: 'Lisa Rodriguez logged in successfully',
      sensitivity_level: 'operational',
    },
    {
      org_id: org.id,
      actor_user_id: createdUsers[3].id,
      actor_type: 'user',
      action: 'resident_updated',
      resource_type: 'resident',
      resource_id: residents[1].id,
      description: 'Updated resident information',
      sensitivity_level: 'part2_protected',
    },
    {
      org_id: org.id,
      actor_user_id: createdUsers[4].id,
      actor_type: 'user',
      action: 'login_success',
      resource_type: 'user',
      resource_id: createdUsers[4].id,
      description: 'Amy Park logged in successfully',
      sensitivity_level: 'operational',
    },
    {
      org_id: org.id,
      actor_user_id: createdUsers[3].id,
      actor_type: 'user',
      action: 'resident_viewed',
      resource_type: 'resident',
      resource_id: residents[2].id,
      description: 'Viewed resident profile',
      sensitivity_level: 'part2_protected',
    },
    {
      org_id: org.id,
      actor_user_id: createdUsers[0].id,
      actor_type: 'user',
      action: 'org_settings_changed',
      resource_type: 'org',
      resource_id: org.id,
      description: 'Updated organization settings',
      sensitivity_level: 'operational',
    },
    {
      org_id: org.id,
      actor_user_id: createdUsers[2].id,
      actor_type: 'user',
      action: 'logout',
      resource_type: 'user',
      resource_id: createdUsers[2].id,
      description: 'Lisa Rodriguez logged out',
      sensitivity_level: 'operational',
    },
  ];

  for (const logData of auditLogsData) {
    const logString = JSON.stringify(logData);
    const currentHash = generateHMAC(logString + previousHash, hmacKey);

    await db.insert(schema.auditLogs).values({
      ...logData,
      previous_log_hash: previousHash || null,
      current_log_hash: currentHash,
    });

    previousHash = currentHash;
  }

  // Summary
  console.log('\n✅ Seed completed successfully!');
  console.log('\nSummary:');
  console.log(`  Organizations: 1`);
  console.log(`  Properties: 2`);
  console.log(`  Houses: ${houses.length}`);
  console.log(`  Rooms: ${rooms.length}`);
  console.log(`  Beds: ${beds.length}`);
  console.log(`  Users: ${createdUsers.length}`);
  console.log(`  Role Assignments: ${roleAssignmentsData.length}`);
  console.log(`  Residents: ${residents.length}`);
  console.log(`  Admissions: ${admissionsData.length}`);
  console.log(`  Consents: ${consentsData.length}`);
  console.log(`  Audit Logs: ${auditLogsData.length}`);
}

async function cleanDatabase(db: any) {
  // Delete in reverse dependency order
  try {
    await db.delete(schema.auditLogs);
    await db.delete(schema.consentDisclosures);
    await db.delete(schema.consents);
    await db.delete(schema.admissions);
    await db.delete(schema.residentContacts);
    await db.delete(schema.leads);
    await db.delete(schema.residents);
    await db.delete(schema.roleAssignments);
    await db.delete(schema.userSessions);
    await db.delete(schema.users);
    await db.delete(schema.beds);
    await db.delete(schema.rooms);
    await db.delete(schema.houses);
    await db.delete(schema.properties);
    await db.delete(schema.organizations);
    console.log('✅ Database cleaned');
  } catch (error) {
    console.error('Error cleaning database:', error);
    throw error;
  }
}

main()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  });
