# Regulatory Research: HIPAA and 42 CFR Part 2

> **Last Updated**: 2026-02-11
> **Owner**: compliance-expert
> **Status**: Complete - Authoritative Citations Included
> **CRITICAL DEADLINE**: February 16, 2026 for 42 CFR Part 2 compliance

---

## Table of Contents
1. [HIPAA Requirements](#hipaa-requirements)
2. [42 CFR Part 2 Requirements](#42-cfr-part-2-requirements)
3. [Application to Recovery Housing Software](#application-to-recovery-housing-software)
4. [NARR Standards](#narr-standards)
5. [Compliance Matrix](#compliance-matrix)

---

## HIPAA Requirements

### Authoritative Sources
- **HIPAA Statute**: Public Law 104-191
- **Privacy Rule**: 45 CFR Part 160 and Subparts A and E of Part 164
- **Security Rule**: 45 CFR Part 160 and Subparts A and C of Part 164
- **Breach Notification Rule**: 45 CFR Part 164, Subpart D
- **HHS HIPAA Website**: https://www.hhs.gov/hipaa/for-professionals/index.html

### 1. Business Associate Agreement (BAA) Requirements

**Source**: 45 CFR 164.502(e), 164.504(e)
**HHS Reference**: https://www.hhs.gov/hipaa/for-professionals/covered-entities/sample-business-associate-agreement-provisions/index.html

A Business Associate (BA) is any entity that:
- Creates, receives, maintains, or transmits PHI on behalf of a covered entity
- Provides services involving PHI disclosure (legal, actuarial, accounting, consulting, data aggregation, management, administration, accreditation, financial)

**Required BAA Elements** (45 CFR 164.504(e)(2)):
| Element | Requirement |
|---------|-------------|
| Permitted Uses | Describe permitted uses and disclosures of PHI |
| Prohibited Uses | Prohibit uses/disclosures not permitted by contract or law |
| Safeguards | Require appropriate safeguards to prevent unauthorized use/disclosure |
| Reporting | Require reporting of unauthorized uses/disclosures and security incidents |
| Subcontractors | Require subcontractors to agree to same restrictions |
| Access Rights | Make PHI available to fulfill individual access rights |
| Amendment | Make PHI available for amendment and incorporate amendments |
| Accounting | Provide information for accounting of disclosures |
| Compliance | Make internal practices available to HHS for compliance review |
| Termination | Return or destroy PHI at termination (if feasible) |

**RecoveryOS Implication**: As a software platform handling PHI, RecoveryOS is a Business Associate. We must:
1. Execute BAAs with all covered entity customers (sober living facilities)
2. Require BAAs from all subprocessors (cloud providers, payment processors, etc.)
3. Maintain chain of BAA compliance through all data flows

### 2. Security Rule Requirements

**Source**: 45 CFR Part 164, Subpart C (164.302-164.318)
**HHS Reference**: https://www.hhs.gov/hipaa/for-professionals/security/index.html

#### Administrative Safeguards (45 CFR 164.308)

| Standard | Implementation Specifications | Required/Addressable |
|----------|------------------------------|---------------------|
| **Security Management Process** (164.308(a)(1)) | | |
| | Risk Analysis | Required |
| | Risk Management | Required |
| | Sanction Policy | Required |
| | Information System Activity Review | Required |
| **Assigned Security Responsibility** (164.308(a)(2)) | Designate security official | Required |
| **Workforce Security** (164.308(a)(3)) | | |
| | Authorization/Supervision | Addressable |
| | Workforce Clearance | Addressable |
| | Termination Procedures | Addressable |
| **Information Access Management** (164.308(a)(4)) | | |
| | Access Authorization | Addressable |
| | Access Establishment/Modification | Addressable |
| **Security Awareness Training** (164.308(a)(5)) | | |
| | Security Reminders | Addressable |
| | Protection from Malware | Addressable |
| | Log-in Monitoring | Addressable |
| | Password Management | Addressable |
| **Security Incident Procedures** (164.308(a)(6)) | Response and Reporting | Required |
| **Contingency Plan** (164.308(a)(7)) | | |
| | Data Backup Plan | Required |
| | Disaster Recovery Plan | Required |
| | Emergency Mode Operation | Required |
| | Testing and Revision | Addressable |
| | Applications/Data Criticality Analysis | Addressable |
| **Evaluation** (164.308(a)(8)) | Periodic technical/nontechnical evaluation | Required |
| **BAA Contracts** (164.308(b)(1)) | Written contract or arrangement | Required |

#### Physical Safeguards (45 CFR 164.310)

| Standard | Implementation Specifications | Required/Addressable |
|----------|------------------------------|---------------------|
| **Facility Access Controls** (164.310(a)(1)) | | |
| | Contingency Operations | Addressable |
| | Facility Security Plan | Addressable |
| | Access Control/Validation | Addressable |
| | Maintenance Records | Addressable |
| **Workstation Use** (164.310(b)) | Policies for workstation use | Required |
| **Workstation Security** (164.310(c)) | Physical safeguards for workstations | Required |
| **Device and Media Controls** (164.310(d)(1)) | | |
| | Disposal | Required |
| | Media Re-use | Required |
| | Accountability | Addressable |
| | Data Backup/Storage | Addressable |

#### Technical Safeguards (45 CFR 164.312)

| Standard | Implementation Specifications | Required/Addressable |
|----------|------------------------------|---------------------|
| **Access Control** (164.312(a)(1)) | | |
| | Unique User Identification | Required |
| | Emergency Access Procedure | Required |
| | Automatic Logoff | Addressable |
| | Encryption and Decryption | Addressable |
| **Audit Controls** (164.312(b)) | Hardware/software/procedural mechanisms | Required |
| **Integrity** (164.312(c)(1)) | | |
| | Mechanism to authenticate ePHI | Addressable |
| **Person or Entity Authentication** (164.312(d)) | Verify identity of persons seeking access | Required |
| **Transmission Security** (164.312(e)(1)) | | |
| | Integrity Controls | Addressable |
| | Encryption | Addressable |

**Note on "Addressable"**: Per 45 CFR 164.306(d)(3), addressable specifications must be implemented if reasonable and appropriate. If not implemented, the covered entity must document why and implement an equivalent alternative measure.

### 3. Privacy Rule Requirements for PHI

**Source**: 45 CFR Part 164, Subpart E (164.500-164.534)
**HHS Reference**: https://www.hhs.gov/hipaa/for-professionals/privacy/index.html

#### Protected Health Information (PHI) Definition
**Source**: 45 CFR 160.103

PHI is individually identifiable health information that is:
- Transmitted or maintained in any form or medium
- Created or received by a covered entity or business associate
- Relates to past, present, or future physical or mental health condition
- Relates to provision of health care
- Relates to payment for health care

**18 HIPAA Identifiers** (for de-identification under 164.514(b)(2)):
1. Names
2. Geographic data smaller than state
3. Dates (except year) related to individual
4. Phone numbers
5. Fax numbers
6. Email addresses
7. Social Security numbers
8. Medical record numbers
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate/license numbers
12. Vehicle identifiers and serial numbers
13. Device identifiers and serial numbers
14. Web URLs
15. IP addresses
16. Biometric identifiers
17. Full-face photographs
18. Any other unique identifying number/code

#### Individual Rights Under Privacy Rule

| Right | Citation | Requirement |
|-------|----------|-------------|
| Access to PHI | 164.524 | Provide access within 30 days (one 30-day extension permitted) |
| Amendment of PHI | 164.526 | Respond to amendment requests within 60 days |
| Accounting of Disclosures | 164.528 | 6-year accounting period, 60-day response time |
| Request Restrictions | 164.522(a) | May agree to restrictions on uses/disclosures |
| Confidential Communications | 164.522(b) | Must accommodate reasonable requests |
| Notice of Privacy Practices | 164.520 | Must provide notice describing practices |

### 4. Breach Notification Requirements

**Source**: 45 CFR Part 164, Subpart D (164.400-164.414)
**HHS Reference**: https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html

#### Definition of Breach (45 CFR 164.402)
Breach = Acquisition, access, use, or disclosure of PHI in violation of the Privacy Rule that compromises the security or privacy of the PHI.

**Exceptions** (not considered breaches):
1. Unintentional acquisition by workforce member acting in good faith
2. Inadvertent disclosure between authorized persons
3. Disclosure where recipient could not reasonably retain the information

#### Risk Assessment (45 CFR 164.402(2))
Evaluate at minimum:
1. Nature and extent of PHI involved (types of identifiers, likelihood of re-identification)
2. Unauthorized person who used/received PHI
3. Whether PHI was actually acquired or viewed
4. Extent to which risk has been mitigated

#### Notification Requirements

| Notification Type | Requirement | Timeline |
|-------------------|-------------|----------|
| **Individual Notice** (164.404) | Written notice to affected individuals | Without unreasonable delay, no later than 60 days |
| **Media Notice** (164.406) | If 500+ residents of a state/jurisdiction | Without unreasonable delay, no later than 60 days |
| **HHS Notice** (164.408) | Breach affecting 500+ individuals | Contemporaneously with individual notice |
| | Breach affecting fewer than 500 | Annual log within 60 days of calendar year end |
| **Business Associate** (164.410) | Notify covered entity | Without unreasonable delay, no later than 60 days |

#### Required Content of Individual Notification (164.404(c))
1. Brief description of breach and date
2. Types of PHI involved
3. Steps individual should take to protect themselves
4. What covered entity is doing to investigate/mitigate/prevent
5. Contact information for questions

### 5. Minimum Necessary Standard

**Source**: 45 CFR 164.502(b), 164.514(d)
**HHS Reference**: https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/minimum-necessary-requirement/index.html

The minimum necessary standard requires covered entities and business associates to make reasonable efforts to limit PHI to the minimum necessary to accomplish the intended purpose.

**Applies to**:
- Uses of PHI
- Disclosures (routine and non-routine)
- Requests for PHI

**Does NOT apply to**:
- Disclosures to or requests by health care provider for treatment
- Disclosures to the individual
- Uses/disclosures pursuant to valid authorization
- Disclosures to HHS for enforcement
- Uses/disclosures required by law
- Uses/disclosures required for HIPAA compliance

**Implementation Requirements** (164.514(d)):
- Identify persons/classes needing access to PHI
- For each class, identify category(ies) of PHI needed
- Limit access to what is needed for job function

---

## 42 CFR Part 2 Requirements

### Authoritative Sources
- **Final Rule (2024)**: Federal Register Vol. 89, No. 32, February 16, 2024
  - Document Citation: 89 FR 12472
  - URL: https://www.federalregister.gov/documents/2024/02/16/2024-02544/confidentiality-of-substance-use-disorder-sud-patient-records
- **Regulatory Text**: 42 CFR Part 2 (https://www.ecfr.gov/current/title-42/chapter-I/subchapter-A/part-2)
- **SAMHSA FAQ**: https://www.samhsa.gov/about-us/who-we-are/laws-regulations/confidentiality-regulations-faqs

### CRITICAL: February 16, 2026 Compliance Deadline

**Source**: 89 FR 12472, 12562-12563 (Effective Dates section)

The 2024 Final Rule established a **two-year compliance period** for certain provisions:

| Provision | Effective Date |
|-----------|---------------|
| Most provisions of final rule | April 16, 2024 |
| Accounting of disclosures requirement | February 16, 2026 |
| Notice to patients requirement (modified) | February 16, 2026 |
| HIPAA breach notification applicability | February 16, 2026 |

**What Takes Effect February 16, 2026**:

1. **Accounting of Disclosures** (42 CFR 2.24): Part 2 programs and their lawful holders must be prepared to provide patients with an accounting of disclosures upon request, similar to HIPAA requirements.

2. **Modified Patient Notice**: Updated notice requirements reflecting alignment with HIPAA.

3. **HIPAA Breach Notification**: Part 2 records become subject to HIPAA breach notification requirements (45 CFR Part 164, Subpart D).

### 1. What is 42 CFR Part 2?

**Source**: 42 CFR 2.1

42 CFR Part 2 protects the confidentiality of **Substance Use Disorder (SUD) patient records** maintained by **federally assisted** programs.

**Key Principle**: Part 2 was enacted because of congressional recognition that stigma associated with SUDs can deter individuals from seeking treatment. The regulations provide **STRICTER** protections than HIPAA.

### 2. Applicability - What Triggers Part 2 Protection?

**Source**: 42 CFR 2.11, 2.12

Part 2 applies when ALL of the following are true:

| Criterion | Definition |
|-----------|------------|
| **Federally Assisted** (2.12(b)) | Program receives federal funds, tax-exempt status, DEA registration for opioid treatment, or Medicare/Medicaid reimbursement |
| **SUD Treatment Program** (2.11) | Individual, entity, or unit that holds itself out as providing SUD diagnosis, treatment, or referral for treatment |
| **Patient Records** (2.11) | Records identifying a patient as having or having had an SUD |

**Federal Assistance Includes** (2.12(b)):
- Federal funding (any amount)
- Tax-exempt status under IRC
- DEA registration to dispense controlled substances for opioid treatment
- CMS certification for Medicare/Medicaid (important for many sober living facilities)

### 3. Consent Requirements

**Source**: 42 CFR 2.31, 2.33

#### Required Elements of Written Consent (42 CFR 2.31)

A valid Part 2 consent **MUST** include:

| Element | Description |
|---------|-------------|
| **Patient Name** | Name of patient |
| **Specific Persons/Entities** | Who is permitted to make disclosure |
| **Purpose** | Purpose of the disclosure |
| **Patient Identifying Information** | How much and what kind may be disclosed |
| **Recipient** | Name or general designation of recipient(s) |
| **Expiration** | Date, event, or condition upon which consent expires |
| **Patient Signature** | Signature of patient (or authorized representative) |
| **Date of Signature** | Date consent was signed |
| **Right to Revoke** | Statement that consent may be revoked at any time |

**2024 Final Rule Changes to Consent**:
- Permits "general designation" of recipients (e.g., "my treating providers")
- Allows electronic signatures
- Permits single consent for all future uses/disclosures for treatment, payment, and health care operations (TPO)

### 4. Redisclosure Restrictions and Notice Requirements

**Source**: 42 CFR 2.32

**This is the MOST CRITICAL difference from HIPAA.**

#### Redisclosure Prohibition
Part 2 records may NOT be redisclosed without patient consent, even between treating providers, unless an exception applies.

#### Required Redisclosure Notice
Any disclosure of Part 2 records must include this notice:

> "This record is protected by federal law (42 CFR Part 2). Federal law prohibits any further disclosure of this record without the written consent of the person to whom it pertains, or as otherwise permitted by 42 CFR Part 2. A general authorization for the release of medical or other information is NOT sufficient for this purpose."

**2024 Final Rule Modification**:
Once Part 2 records are disclosed for TPO pursuant to a valid consent, recipients who are HIPAA covered entities or business associates:
- May redisclose for TPO without additional consent
- Must still include redisclosure notice
- Cannot redisclose to entities that are not covered entities or business associates

### 5. Part 2 vs. HIPAA - Key Differences

**Source**: 42 CFR Part 2 and 45 CFR Part 164

| Aspect | HIPAA | 42 CFR Part 2 |
|--------|-------|---------------|
| **Consent for TPO** | Not required (notice sufficient) | Required (written consent) |
| **Redisclosure** | Permitted for TPO | Prohibited without consent (pre-2024); Permitted for TPO with notice (2024 rule) |
| **Legal Proceedings** | Subpoena generally sufficient | Court order with good cause finding required |
| **Law Enforcement** | Multiple exceptions permitting disclosure | Very limited exceptions; generally prohibited |
| **Research** | IRB approval or waiver | Part 2 specific research provisions |
| **Breach Notification** | Required | Required (as of Feb 16, 2026) |
| **Penalties** | Civil and criminal | Criminal under 42 USC 290dd-2 |

### 6. Qualified Service Organization Agreement (QSOA) Requirements

**Source**: 42 CFR 2.11, 2.12(c)(4)

A QSOA is similar to a HIPAA BAA but specific to Part 2 programs.

**Definition**: A Qualified Service Organization (QSO) provides services to a Part 2 program such as:
- Data processing
- Bill collecting
- Dosage preparation
- Laboratory analyses
- Legal, accounting, auditing, or administrative services

**Required QSOA Elements**:

| Element | Requirement |
|---------|-------------|
| Acknowledgment | QSO acknowledges it is bound by Part 2 |
| Prohibition on Redisclosure | QSO may not redisclose except as permitted |
| Resist in Legal Proceedings | QSO must resist efforts to obtain records |
| No Patient-Identifying Information | QSO may not use for purposes other than those specified |

**2024 Final Rule Change**:
- Part 2 programs may use either a QSOA or a HIPAA BAA that includes Part 2-specific provisions
- BAA must include Part 2 obligations

### 7. Audit and Accounting of Disclosures Requirements

**Source**: 42 CFR 2.24, 2.25 (as amended by 2024 Final Rule)

#### Audit Requirements (42 CFR 2.25)
Part 2 programs must have formal policies and procedures to audit patient records periodically for compliance.

**Audit Must Address**:
- Access patterns
- Unusual access activity
- Disclosures
- Consent management

#### Accounting of Disclosures (42 CFR 2.24) - EFFECTIVE FEBRUARY 16, 2026

**New Requirement**: Patients have the right to request an accounting of disclosures, similar to HIPAA (45 CFR 164.528).

**Accounting Must Include**:
- Date of disclosure
- Name of recipient
- Address of recipient (if known)
- Description of information disclosed
- Statement of purpose or copy of request

**Exceptions** (disclosures that do not need to be accounted):
- To the patient
- Incident to an otherwise permitted disclosure
- Pursuant to written authorization
- For treatment, payment, or health care operations (IMPORTANT DIFFERENCE from HIPAA)
- To persons involved in the patient's care

**Retention Period**: 6 years from date of disclosure

### 8. Criminal Penalties

**Source**: 42 USC 290dd-2(f)

| Violation | Penalty |
|-----------|---------|
| First offense | Up to $500 fine |
| Subsequent offense | Up to $5,000 fine |

Note: While monetary penalties appear lower than HIPAA, violations can also result in:
- Loss of federal funding
- Exclusion from federal health care programs
- State law penalties
- Civil liability

---

## Application to Recovery Housing Software

### 1. What Data is Considered Part 2 Protected?

**Source**: 42 CFR 2.11, 2.12

In the context of recovery/sober living housing:

| Data Type | Part 2 Protected? | Rationale |
|-----------|-------------------|-----------|
| Resident name + facility association | YES | Identifies person as seeking/receiving SUD treatment |
| Drug testing results | YES | Directly relates to SUD status |
| Treatment referrals | YES | Identifies SUD treatment |
| Meeting attendance (AA/NA) | YES | Identifies participation in SUD recovery |
| Medication records (MAT) | YES | Identifies opioid treatment |
| Intake assessments | YES | Typically includes SUD history |
| Progress notes | YES | Relates to SUD recovery status |
| Payment records | MAYBE | If they reveal SUD treatment (e.g., payment to MAT provider) |
| General contact information only | NO | Does not identify SUD status |
| Room assignments without context | NO | Does not identify SUD status |

**Critical Point**: The mere fact that someone resides in a sober living facility is Part 2 protected information because it identifies them as having or having had a substance use disorder.

### 2. What Triggers Part 2 Applicability for RecoveryOS Customers?

A sober living facility using RecoveryOS triggers Part 2 if it:

| Trigger | Common Scenario |
|---------|-----------------|
| Accepts Medicaid/Medicare | Many facilities accept government payment |
| Receives any federal grant | SAMHSA, HUD, block grants |
| Is tax-exempt 501(c)(3) | Most nonprofit facilities |
| Has DEA registration | If providing MAT on-site |
| Receives state funding from federal sources | Pass-through federal funds |

**Practical Reality**: Most sober living facilities that use software like RecoveryOS will be federally assisted and therefore subject to Part 2.

### 3. Consent Management Requirements

RecoveryOS must support:

| Requirement | Implementation |
|-------------|----------------|
| **Capture all consent elements** | Form builder with all 42 CFR 2.31 required fields |
| **Electronic signatures** | Compliant e-signature (date, time, identity verification) |
| **Consent tracking** | Database of all active consents per resident |
| **Revocation handling** | Ability to revoke consent, immediate effect |
| **Expiration management** | Track and alert on expiring consents |
| **Consent verification** | Before any disclosure, verify valid consent exists |
| **Audit trail** | Every consent action logged immutably |

### 4. Audit Logging Requirements

**HIPAA Requirement** (45 CFR 164.312(b)): Audit controls - mechanisms to record and examine access.

**Part 2 Requirement** (42 CFR 2.25): Formal audit policies for patient records.

**Combined Requirements for RecoveryOS**:

| Audit Event | Required Data | Retention |
|-------------|---------------|-----------|
| User login/logout | User ID, timestamp, IP, success/failure | 6 years |
| PHI access | User ID, record ID, timestamp, access type | 6 years |
| PHI modification | User ID, record ID, old value, new value, timestamp | 6 years |
| PHI disclosure | User ID, recipient, purpose, timestamp, consent reference | 6 years |
| Consent creation/revocation | All consent details, timestamp | 6 years |
| Failed access attempts | User ID, record attempted, reason, timestamp | 6 years |
| Permission changes | Admin ID, user affected, old/new permissions | 6 years |
| Export/download | User ID, data scope, timestamp, format | 6 years |

**Immutability Requirement**: Audit logs must be append-only, tamper-evident.

### 5. Encryption Requirements

**HIPAA Technical Safeguards** (45 CFR 164.312):

| Context | Requirement | RecoveryOS Implementation |
|---------|-------------|---------------------------|
| Data at Rest (164.312(a)(2)(iv)) | Addressable | AES-256 encryption for all PHI |
| Data in Transit (164.312(e)(2)(ii)) | Addressable | TLS 1.2+ for all connections |
| Integrity (164.312(c)(1)) | Addressable | HMAC/digital signatures |
| Authentication (164.312(d)) | Required | MFA for all users |

**Note**: Though encryption is "addressable" under HIPAA, implementing it is the standard of care and expected. Failure to encrypt creates significant breach risk.

### 6. Access Control Requirements

**HIPAA** (45 CFR 164.312(a)(1)): Access controls that restrict access to authorized users.

**Part 2** (42 CFR 2.13): Disclosures only as permitted.

**Combined Role-Based Access Control for RecoveryOS**:

| Role | Access Level | Minimum Necessary Application |
|------|--------------|------------------------------|
| Super Admin | System configuration only | No resident PHI |
| Org Admin | Organization settings | Limited PHI access |
| Property Manager | Residents at property | Full PHI for property |
| House Manager | Residents at house | Full PHI for house |
| House Monitor | Limited operations | Check-in/out, no medical |
| Resident | Own records only | Full access to own PHI |
| Alumni | Own historical records | Read-only access |
| Family Contact | Designated info only | Per consent only |
| External Provider | Per consent | Only consented information |

**Segmentation Requirements**:
- Part 2 data MUST be segregable from non-Part 2 data
- Access to Part 2 data requires explicit authorization
- Audit logging must capture Part 2 vs. non-Part 2 access

---

## NARR Standards

### Authoritative Source
- National Alliance for Recovery Residences (NARR)
- https://narronline.org/
- NARR Standard 3.0 (current version)

### NARR Levels and Documentation Requirements

NARR certifies recovery residences at four levels. Documentation requirements increase with level.

| Level | Description | Key Documentation Requirements |
|-------|-------------|-------------------------------|
| **Level 1** | Peer-run, democratically operated | House rules, peer accountability records |
| **Level 2** | Monitored, house manager | Level 1 + intake documentation, monitoring logs, drug screening records |
| **Level 3** | Supervised, clinical connections | Level 2 + service plans, case management notes, referral documentation |
| **Level 4** | Service provider, clinical services | Level 3 + treatment records, clinical documentation, licensed oversight |

### NARR Quality Standards Relevant to Software

| Standard Area | Software Relevance |
|---------------|-------------------|
| **Administrative Practices** | Record keeping, documentation, policies |
| **Fiscal Responsibility** | Payment tracking, ledger, financial transparency |
| **Property Management** | Bed census, maintenance tracking |
| **Community Relations** | Communication logs, neighbor relations |
| **Recovery Support** | Meeting attendance, recovery milestones |
| **Health and Safety** | Incident reports, medication management |

### NARR Documentation RecoveryOS Should Support

| Document Type | NARR Level | Part 2 Implications |
|---------------|------------|---------------------|
| Residency Agreement | All | May contain SUD status |
| House Rules Acknowledgment | All | Generally not Part 2 |
| Intake Assessment | 2+ | Contains SUD history - Part 2 |
| Drug Screening Consent | 2+ | Part 2 |
| Drug Screening Results | 2+ | Part 2 |
| Service/Recovery Plan | 3+ | Part 2 |
| Case Management Notes | 3+ | Part 2 |
| Treatment Referrals | 3+ | Part 2 |
| Clinical Progress Notes | 4 | Part 2 + potentially state licensing |
| Incident Reports | All | May contain Part 2 if SUD-related |

---

## Compliance Matrix

### Pre-Launch Requirements

| Requirement | HIPAA Citation | Part 2 Citation | Status |
|-------------|----------------|-----------------|--------|
| Execute BAAs with subprocessors | 164.504(e) | 2.11 (QSOA) | Required |
| Risk Analysis | 164.308(a)(1)(ii)(A) | - | Required |
| Security Policies | 164.308(a)(1) | 2.25 | Required |
| Encryption at Rest | 164.312(a)(2)(iv) | - | Required |
| Encryption in Transit | 164.312(e)(2)(ii) | - | Required |
| Audit Logging | 164.312(b) | 2.25 | Required |
| Access Controls (RBAC) | 164.312(a)(1) | 2.13 | Required |
| Unique User IDs | 164.312(a)(2)(i) | - | Required |
| MFA | 164.312(d) | - | Required |
| Consent Management | - | 2.31 | Required |
| Redisclosure Notice | - | 2.32 | Required |
| Breach Notification Procedures | 164.400-414 | 2.16 (as of 2/16/26) | Required |

### February 16, 2026 Deadline Checklist

| Requirement | Citation | Implementation Needed |
|-------------|----------|----------------------|
| Accounting of Disclosures | 42 CFR 2.24 | Disclosure tracking system, patient request workflow |
| Modified Patient Notice | 42 CFR 2.22 | Updated notice template, delivery tracking |
| Breach Notification for Part 2 | 42 CFR 2.16 + 45 CFR 164.400 | Breach detection, notification workflow |

---

## Summary: RecoveryOS Compliance Architecture

### Core Principles

1. **Part 2 is Stricter**: When HIPAA and Part 2 conflict, follow Part 2
2. **Consent is King**: No disclosure of Part 2 data without valid, logged consent
3. **Audit Everything**: Every access, modification, and disclosure must be logged immutably
4. **Segregate Part 2 Data**: Logically separate Part 2 data with additional access controls
5. **Minimum Necessary**: Role-based access limiting data exposure
6. **Encryption Everywhere**: AES-256 at rest, TLS 1.2+ in transit

### Subprocessor BAA Requirements

Every third-party service must have:
- [ ] HIPAA BAA executed
- [ ] Part 2/QSOA provisions included
- [ ] Breach notification obligations
- [ ] Audit cooperation clauses
- [ ] Encryption attestation

**Known BAA-Available Providers**:
- Cloud: AWS, GCP, Azure, Neon, Supabase
- Auth: Clerk, Auth0
- Payments: Stripe
- Storage: AWS S3, Cloudflare R2
- Email: SendGrid, Postmark (limited)

### Critical Dates

| Date | Event | Action Required |
|------|-------|-----------------|
| **February 16, 2026** | Part 2 accounting + breach notification | Full compliance required |
| Ongoing | HIPAA compliance | Continuous |
| Annual | Risk assessment update | Required |
| Annual | Security training | Required |

---

## References

### HIPAA
- HHS HIPAA Home: https://www.hhs.gov/hipaa/index.html
- Security Rule: https://www.hhs.gov/hipaa/for-professionals/security/index.html
- Privacy Rule: https://www.hhs.gov/hipaa/for-professionals/privacy/index.html
- Breach Notification: https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html
- BAA Guidance: https://www.hhs.gov/hipaa/for-professionals/covered-entities/sample-business-associate-agreement-provisions/index.html
- Minimum Necessary: https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/minimum-necessary-requirement/index.html

### 42 CFR Part 2
- 2024 Final Rule: https://www.federalregister.gov/documents/2024/02/16/2024-02544/confidentiality-of-substance-use-disorder-sud-patient-records
- Current Regulatory Text: https://www.ecfr.gov/current/title-42/chapter-I/subchapter-A/part-2
- SAMHSA FAQ: https://www.samhsa.gov/about-us/who-we-are/laws-regulations/confidentiality-regulations-faqs

### NARR
- NARR Standards: https://narronline.org/affiliate-services/standards-and-certification/

---

*Document prepared by compliance-expert agent. Last verified: 2026-02-11*
*All citations reference authoritative federal sources. Verify current regulatory text before implementation.*
