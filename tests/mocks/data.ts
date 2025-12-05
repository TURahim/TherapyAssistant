import { CrisisSeverity, SessionStatus, UserRole } from '@prisma/client';

/**
 * Sample transcripts for testing
 */
export const SAMPLE_TRANSCRIPTS = {
  normal: `
Therapist: Hello, how are you doing today?
Client: I'm doing okay. Had a pretty good week overall.
Therapist: That's good to hear. Tell me more about what's been going well.
Client: Work has been less stressful. I've been using those breathing techniques we talked about.
Therapist: That's wonderful progress. How often have you been practicing?
Client: Almost every day. It really helps when I start feeling anxious.
Therapist: I'm glad you're finding them helpful. Let's talk about your goals for this week.
Client: I'd like to work on being more assertive at work.
Therapist: That sounds like a great goal. Let's explore what that might look like for you.
`,

  withAnxiety: `
Therapist: How have things been since our last session?
Client: Not great, honestly. I've been feeling really anxious about everything.
Therapist: I'm sorry to hear that. Can you tell me more about what's been triggering these feelings?
Client: Work is overwhelming. I can't stop worrying about deadlines.
Therapist: That sounds very stressful. Have the anxiety management techniques been helping?
Client: Sometimes. But when it gets really bad, nothing seems to work.
Therapist: Let's explore some additional strategies that might help during those intense moments.
Client: That would be good. I just want to feel normal again.
`,

  withCrisisLanguage: `
Therapist: I want to check in with you about something you mentioned last time.
Client: I've been having really dark thoughts lately.
Therapist: Can you tell me more about what you mean by dark thoughts?
Client: Sometimes I feel like I don't want to live anymore. Like everything would be easier if I just wasn't here.
Therapist: I appreciate you being honest with me. These thoughts sound very painful. Have you had any thoughts about hurting yourself?
Client: Not specifically. It's more like a wish to just disappear.
Therapist: I hear you. It sounds like you're carrying a lot of pain right now. I want to make sure we address this together and keep you safe.
`,

  withSevereRisk: `
Therapist: You seem upset today. What's going on?
Client: I can't do this anymore. I've been thinking about ending my life.
Therapist: That's a very serious thing to share. I'm glad you're telling me. Can you tell me more about these thoughts?
Client: I have pills at home. I've been counting them, thinking about how many I would need.
Therapist: I hear how much pain you're in. I need to ask - do you have a plan to hurt yourself?
Client: I've thought about it a lot. I wrote a note last night.
Therapist: This is a crisis situation. We need to make sure you're safe right now.
`,

  withSelfHarm: `
Therapist: I noticed what looks like some marks on your arm. Can we talk about that?
Client: I've been cutting again. I couldn't help it.
Therapist: I'm concerned about you. How often has this been happening?
Client: A few times this week. It's the only thing that makes the pain stop.
Therapist: I understand you're trying to cope with difficult emotions. Let's work together on finding safer ways to manage these feelings.
`,

  short: 'Therapist: Hello.\nClient: Hi.',

  noSpeakers: `This is a transcript without speaker labels.
It just contains text content.
There are multiple lines here.
But no clear indication of who is speaking.`,

  longTranscript: Array(50).fill(`
Therapist: Let's continue our discussion about coping strategies.
Client: Yes, I've been practicing mindfulness like we discussed.
Therapist: How has that been going for you?
Client: It's challenging but I think it's helping.
`).join('\n'),
};

/**
 * Sample user data
 */
export const SAMPLE_USERS = {
  therapist: {
    id: 'therapist-1',
    email: 'therapist@test.com',
    passwordHash: 'hashed',
    firstName: 'Test',
    lastName: 'Therapist',
    role: UserRole.THERAPIST,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  client: {
    id: 'client-1',
    email: 'client@test.com',
    passwordHash: 'hashed',
    firstName: 'Test',
    lastName: 'Client',
    role: UserRole.CLIENT,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

/**
 * Sample client data
 */
export const SAMPLE_CLIENTS = {
  active: {
    id: 'client-record-1',
    userId: 'client-1',
    therapistId: 'therapist-1',
    preferredName: 'Tester',
    dateOfBirth: new Date('1990-01-01'),
    pronouns: 'they/them',
    emergencyContact: 'Emergency Person',
    emergencyPhone: '555-0123',
    intakeDate: new Date(),
    isActive: true,
    notes: 'Test client for unit tests',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

/**
 * Sample session data
 */
export const SAMPLE_SESSIONS = {
  scheduled: {
    id: 'session-1',
    clientId: 'client-record-1',
    therapistId: 'therapist-1',
    sessionNumber: 1,
    scheduledAt: new Date(),
    status: SessionStatus.SCHEDULED,
    crisisSeverity: CrisisSeverity.NONE,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  completed: {
    id: 'session-2',
    clientId: 'client-record-1',
    therapistId: 'therapist-1',
    sessionNumber: 2,
    scheduledAt: new Date(Date.now() - 86400000),
    startedAt: new Date(Date.now() - 86400000),
    endedAt: new Date(Date.now() - 86400000 + 3600000),
    status: SessionStatus.COMPLETED,
    durationMinutes: 60,
    transcript: SAMPLE_TRANSCRIPTS.normal,
    crisisSeverity: CrisisSeverity.NONE,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  withCrisis: {
    id: 'session-3',
    clientId: 'client-record-1',
    therapistId: 'therapist-1',
    sessionNumber: 3,
    scheduledAt: new Date(),
    startedAt: new Date(),
    status: SessionStatus.IN_PROGRESS,
    transcript: SAMPLE_TRANSCRIPTS.withCrisisLanguage,
    crisisSeverity: CrisisSeverity.MEDIUM,
    crisisIndicators: {
      indicators: [
        {
          type: 'suicidal_ideation',
          quote: 'I don\'t want to live anymore',
          severity: 'MEDIUM',
        },
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

/**
 * Sample canonical plan
 */
export const SAMPLE_CANONICAL_PLAN = {
  clientId: 'client-record-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 1,
  presentingConcerns: [
    {
      id: 'concern-1',
      description: 'Generalized anxiety affecting daily functioning',
      severity: 'moderate' as const,
      duration: '6 months',
      impact: 'Difficulty concentrating at work, sleep disturbance',
      sourceSessionIds: ['session-2'],
    },
  ],
  clinicalImpressions: [
    {
      id: 'impression-1',
      observation: 'Client demonstrates good insight into anxiety triggers',
      category: 'Cognitive' as const,
      sourceSessionIds: ['session-2'],
    },
  ],
  diagnoses: [
    {
      id: 'diagnosis-1',
      icdCode: 'F41.1',
      name: 'Generalized Anxiety Disorder',
      status: 'provisional' as const,
    },
  ],
  goals: [
    {
      id: 'goal-1',
      type: 'short_term' as const,
      description: 'Reduce frequency of anxiety episodes',
      measurableOutcome: 'Report fewer than 3 episodes per week',
      status: 'in_progress' as const,
      progress: 30,
      interventionIds: ['intervention-1'],
      sourceSessionIds: ['session-2'],
    },
  ],
  interventions: [
    {
      id: 'intervention-1',
      modality: 'CBT',
      name: 'Cognitive Restructuring',
      description: 'Identify and challenge anxious thoughts',
      frequency: 'Weekly practice',
      rationale: 'Evidence-based approach for anxiety reduction',
    },
  ],
  strengths: [
    {
      id: 'strength-1',
      category: 'personal' as const,
      description: 'Strong motivation to improve',
      sourceSessionIds: ['session-2'],
    },
  ],
  riskFactors: [],
  homework: [
    {
      id: 'homework-1',
      title: 'Thought Journal',
      description: 'Record anxious thoughts and challenge them',
      rationale: 'Build awareness and practice cognitive restructuring',
      goalIds: ['goal-1'],
      status: 'assigned' as const,
    },
  ],
  crisisAssessment: {
    severity: CrisisSeverity.NONE,
    lastAssessed: new Date().toISOString(),
    safetyPlanInPlace: false,
  },
  sessionReferences: [
    {
      sessionId: 'session-2',
      sessionNumber: 2,
      date: new Date().toISOString(),
      keyContributions: ['Discussed anxiety patterns', 'Introduced CBT concepts'],
    },
  ],
};

/**
 * Expected crisis assessment results
 */
export const EXPECTED_CRISIS_RESULTS = {
  normal: {
    isCrisis: false,
    severity: CrisisSeverity.NONE,
  },
  withAnxiety: {
    isCrisis: false,
    severity: CrisisSeverity.NONE,
  },
  withCrisisLanguage: {
    isCrisis: true,
    severity: CrisisSeverity.MEDIUM,
  },
  withSevereRisk: {
    isCrisis: true,
    severity: CrisisSeverity.CRITICAL,
  },
  withSelfHarm: {
    isCrisis: true,
    severity: CrisisSeverity.HIGH,
  },
};

