import { PrismaClient, UserRole, TherapeuticModality, CrisisSeverity } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (in reverse order of dependencies)
  console.log('🧹 Cleaning existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.progressEntry.deleteMany();
  await prisma.homework.deleteMany();
  await prisma.planEdit.deleteMany();
  await prisma.treatmentPlanVersion.deleteMany();
  await prisma.treatmentPlan.deleteMany();
  await prisma.sessionSummary.deleteMany();
  await prisma.mediaUpload.deleteMany();
  await prisma.session.deleteMany();
  await prisma.fewShotExample.deleteMany();
  await prisma.therapistPreferences.deleteMany();
  await prisma.client.deleteMany();
  await prisma.therapist.deleteMany();
  await prisma.user.deleteMany();

  // Create demo therapist
  console.log('👨‍⚕️ Creating demo therapist...');
  const therapistPassword = await hash('therapist123', 12);
  const therapistUser = await prisma.user.create({
    data: {
      email: 'therapist@tavahealth.demo',
      passwordHash: therapistPassword,
      firstName: 'Sarah',
      lastName: 'Thompson',
      role: UserRole.THERAPIST,
      emailVerified: new Date(),
      therapist: {
        create: {
          licenseNumber: 'LPC-12345',
          licenseState: 'CA',
          specializations: ['Anxiety', 'Depression', 'Trauma', 'CBT'],
          bio: 'Licensed Professional Counselor with 10+ years of experience specializing in cognitive behavioral therapy and trauma-informed care.',
          preferences: {
            create: {
              preferredModalities: [
                TherapeuticModality.CBT,
                TherapeuticModality.ACT,
                TherapeuticModality.MI,
              ],
              defaultSessionLength: 50,
              preferLanguageLevel: 'professional',
              includeIcdCodes: true,
              autoGenerateSummary: true,
              crisisAlertThreshold: CrisisSeverity.MEDIUM,
            },
          },
        },
      },
    },
    include: {
      therapist: true,
    },
  });

  console.log(`  ✓ Created therapist: ${therapistUser.email}`);

  // Create demo client
  console.log('👤 Creating demo client...');
  const clientPassword = await hash('client123', 12);
  const clientUser = await prisma.user.create({
    data: {
      email: 'client@tavahealth.demo',
      passwordHash: clientPassword,
      firstName: 'Alex',
      lastName: 'Johnson',
      role: UserRole.CLIENT,
      emailVerified: new Date(),
      client: {
        create: {
          therapistId: therapistUser.therapist!.id,
          preferredName: 'Alex',
          pronouns: 'they/them',
          dateOfBirth: new Date('1990-05-15'),
          emergencyContact: 'Jamie Johnson (Partner)',
          emergencyPhone: '555-123-4567',
          intakeDate: new Date('2024-01-15'),
          notes: 'Client referred by PCP for anxiety management. Strong support system.',
        },
      },
    },
    include: {
      client: true,
    },
  });

  console.log(`  ✓ Created client: ${clientUser.email}`);

  // Create a second demo client
  const client2Password = await hash('client456', 12);
  const client2User = await prisma.user.create({
    data: {
      email: 'client2@tavahealth.demo',
      passwordHash: client2Password,
      firstName: 'Morgan',
      lastName: 'Chen',
      role: UserRole.CLIENT,
      emailVerified: new Date(),
      client: {
        create: {
          therapistId: therapistUser.therapist!.id,
          preferredName: null,
          pronouns: 'she/her',
          dateOfBirth: new Date('1985-11-22'),
          intakeDate: new Date('2024-02-01'),
          notes: 'Self-referred for work-related stress and burnout.',
        },
      },
    },
    include: {
      client: true,
    },
  });

  console.log(`  ✓ Created client: ${client2User.email}`);

  // Create demo sessions for first client
  console.log('📅 Creating demo sessions...');
  const session1 = await prisma.session.create({
    data: {
      clientId: clientUser.client!.id,
      therapistId: therapistUser.therapist!.id,
      sessionNumber: 1,
      scheduledAt: new Date('2024-01-22T10:00:00Z'),
      startedAt: new Date('2024-01-22T10:02:00Z'),
      endedAt: new Date('2024-01-22T10:52:00Z'),
      status: 'COMPLETED',
      durationMinutes: 50,
      transcript: `[Session transcript - Intake Session]
      
Therapist: Welcome, Alex. I'm glad you could make it today. How are you feeling about being here?

Client: Honestly, a bit nervous. I've never been to therapy before, but my doctor thought it might help with the anxiety I've been experiencing.

Therapist: That's completely understandable. Many people feel nervous at first. Can you tell me more about what's been going on?

Client: Well, for the past few months, I've been having trouble sleeping, my heart races sometimes for no reason, and I find myself worrying constantly about work and... well, everything really.

Therapist: That sounds really challenging. When did you first start noticing these symptoms?

Client: It started getting bad around September when I got a promotion at work. The new responsibilities have been overwhelming.

Therapist: Congratulations on the promotion, and also thank you for sharing that. It's not uncommon for positive life changes to also bring stress. What does a typical day look like for you now?

Client: I wake up already thinking about my to-do list. I skip breakfast because I'm too anxious to eat. Work is non-stop meetings and decisions. By the time I get home, I'm exhausted but can't wind down.

Therapist: I hear you. It sounds like anxiety is affecting multiple areas of your life - your sleep, eating, and ability to relax. What are some things that have helped, even a little?

Client: Jamie, my partner, has been really supportive. And I've tried meditation apps, but I can't seem to focus long enough to use them.

Therapist: Having a supportive partner is a wonderful strength. And it's great that you've already tried some self-help strategies. In our work together, we can build on that.`,
      notes: 'Good rapport established. Client is motivated and has supportive partner. Recommend weekly sessions initially.',
      crisisSeverity: CrisisSeverity.NONE,
    },
  });

  const session2 = await prisma.session.create({
    data: {
      clientId: clientUser.client!.id,
      therapistId: therapistUser.therapist!.id,
      sessionNumber: 2,
      scheduledAt: new Date('2024-01-29T10:00:00Z'),
      startedAt: new Date('2024-01-29T10:00:00Z'),
      endedAt: new Date('2024-01-29T10:50:00Z'),
      status: 'COMPLETED',
      durationMinutes: 50,
      transcript: `[Session transcript - Session 2: CBT Introduction]

Therapist: How has your week been since our last session?

Client: Better in some ways. I told Jamie about coming here and they were really supportive. But I had a panic attack at work on Wednesday.

Therapist: I'm glad you have Jamie's support. Can you tell me more about what happened Wednesday?

Client: I was about to present to the executive team and suddenly I couldn't breathe. I had to step out and collect myself. It was embarrassing.

Therapist: First, I want to acknowledge how difficult that must have been. Panic attacks can feel very scary. Let's talk about what was going through your mind in that moment.

Client: I kept thinking "I'm going to mess this up" and "everyone will see I'm not qualified for this job."

Therapist: Those are what we call automatic negative thoughts. They feel very real in the moment, but they're often not accurate reflections of reality. Today I'd like to introduce you to a technique called cognitive restructuring.

Client: Okay, that sounds helpful.

Therapist: When you notice a thought like "I'm going to mess this up," I want you to ask yourself: What's the evidence for this thought? What's the evidence against it? What would I tell a friend who had this thought?

Client: That makes sense. I guess the evidence against it is that I've given successful presentations before. And I got this promotion because they believe in me.`,
      notes: 'Introduced cognitive restructuring. Client receptive to CBT techniques. Panic attack at work - monitor for frequency.',
      crisisSeverity: CrisisSeverity.NONE,
    },
  });

  // Create an upcoming session
  const upcomingDate = new Date();
  upcomingDate.setDate(upcomingDate.getDate() + 7);
  upcomingDate.setHours(10, 0, 0, 0);

  await prisma.session.create({
    data: {
      clientId: clientUser.client!.id,
      therapistId: therapistUser.therapist!.id,
      sessionNumber: 3,
      scheduledAt: upcomingDate,
      status: 'SCHEDULED',
    },
  });

  console.log(`  ✓ Created 3 sessions for ${clientUser.firstName}`);

  // Create session summary for session 1
  await prisma.sessionSummary.create({
    data: {
      sessionId: session1.id,
      therapistSummary: `Initial intake session with Alex Johnson. Client presents with generalized anxiety symptoms including sleep disturbance, appetite changes, racing thoughts, and physical symptoms (tachycardia). Symptoms onset correlates with work promotion in September 2023. Client demonstrates good insight and motivation for treatment. Protective factors include supportive partner and previous self-help attempts. Treatment approach: CBT with focus on anxiety management techniques. Recommend weekly sessions.`,
      clientSummary: `Today was our first session together! We talked about what's been going on with your anxiety and how it's affecting your daily life. It sounds like the new job responsibilities have been stressful, which is completely normal. I'm glad you have Jamie's support - that's a real strength! Next time, we'll start learning some practical techniques to help manage those worried thoughts and racing heart. You're already taking a big step by being here. 💪`,
      keyTopics: ['Anxiety symptoms', 'Work stress', 'Sleep issues', 'Support system'],
      moodAssessment: 'Anxious but hopeful',
    },
  });

  console.log('  ✓ Created session summaries');

  // Create a sample treatment plan
  console.log('📋 Creating demo treatment plan...');
  const canonicalPlan = {
    clientId: clientUser.client!.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    presentingConcerns: [
      {
        id: 'pc-1',
        description: 'Generalized anxiety with physical symptoms',
        severity: 'moderate',
        duration: '4 months',
        impact: 'Affecting work performance, sleep, and daily functioning',
        sourceSessionIds: [session1.id],
      },
    ],
    clinicalImpressions: [
      {
        id: 'ci-1',
        observation: 'Client demonstrates good insight into anxiety triggers',
        category: 'Cognitive',
        sourceSessionIds: [session1.id],
      },
    ],
    diagnoses: [
      {
        id: 'dx-1',
        icdCode: 'F41.1',
        name: 'Generalized Anxiety Disorder',
        status: 'provisional',
        notes: 'Meets criteria based on symptom presentation',
      },
    ],
    goals: [
      {
        id: 'g-1',
        type: 'short_term',
        description: 'Reduce frequency of panic attacks',
        measurableOutcome: 'From weekly to monthly occurrence',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'in_progress',
        progress: 25,
        interventionIds: ['int-1'],
        sourceSessionIds: [session2.id],
      },
      {
        id: 'g-2',
        type: 'long_term',
        description: 'Develop sustainable anxiety management toolkit',
        measurableOutcome: 'Client can independently apply 3+ coping strategies',
        status: 'in_progress',
        progress: 10,
        interventionIds: ['int-1', 'int-2'],
        sourceSessionIds: [session1.id],
      },
    ],
    interventions: [
      {
        id: 'int-1',
        modality: 'CBT',
        name: 'Cognitive Restructuring',
        description: 'Identify and challenge automatic negative thoughts',
        frequency: 'Weekly practice',
        rationale: 'Address catastrophic thinking patterns',
      },
      {
        id: 'int-2',
        modality: 'CBT',
        name: 'Behavioral Activation',
        description: 'Gradually increase engagement in positive activities',
        frequency: 'Daily',
        rationale: 'Combat avoidance behaviors',
      },
    ],
    strengths: [
      {
        id: 's-1',
        category: 'social',
        description: 'Supportive partner (Jamie)',
        sourceSessionIds: [session1.id],
      },
      {
        id: 's-2',
        category: 'personal',
        description: 'High motivation for change',
        sourceSessionIds: [session1.id],
      },
    ],
    riskFactors: [],
    homework: [
      {
        id: 'hw-1',
        title: 'Thought Record',
        description: 'Complete daily thought record tracking anxious thoughts',
        rationale: 'Build awareness of thought patterns',
        goalIds: ['g-1', 'g-2'],
        status: 'assigned',
      },
    ],
    crisisAssessment: {
      severity: 'NONE',
      lastAssessed: new Date().toISOString(),
      safetyPlanInPlace: false,
    },
    sessionReferences: [
      {
        sessionId: session1.id,
        sessionNumber: 1,
        date: session1.scheduledAt.toISOString(),
        keyContributions: ['Initial assessment', 'Identified presenting concerns'],
      },
      {
        sessionId: session2.id,
        sessionNumber: 2,
        date: session2.scheduledAt.toISOString(),
        keyContributions: ['Introduced CBT techniques', 'Discussed panic attack'],
      },
    ],
  };

  const therapistView = {
    header: {
      clientName: 'Alex Johnson',
      planStatus: 'ACTIVE',
      lastUpdated: new Date().toISOString(),
      version: 1,
    },
    clinicalSummary: {
      presentingProblems:
        'Generalized anxiety with panic attacks, sleep disturbance, and work-related stress following job promotion.',
      diagnosticFormulation:
        'Provisional GAD diagnosis based on excessive worry across multiple domains with physical symptoms.',
      treatmentRationale:
        'CBT approach selected due to strong evidence base for anxiety disorders and client preference for practical techniques.',
    },
    diagnoses: {
      primary: { code: 'F41.1', name: 'Generalized Anxiety Disorder', status: 'Provisional' },
      secondary: [],
    },
    treatmentGoals: {
      shortTerm: [
        {
          id: 'g-1',
          goal: 'Reduce panic attack frequency',
          objective: 'From weekly to monthly',
          progress: 25,
          status: 'In Progress',
          interventions: ['Cognitive Restructuring'],
        },
      ],
      longTerm: [
        {
          id: 'g-2',
          goal: 'Develop anxiety management toolkit',
          objective: 'Independent use of 3+ coping strategies',
          progress: 10,
          status: 'In Progress',
          interventions: ['CBT', 'Behavioral Activation'],
        },
      ],
    },
    interventionPlan: [
      {
        modality: 'CBT',
        technique: 'Cognitive Restructuring',
        description: 'Identify and challenge automatic negative thoughts',
        frequency: 'Weekly',
        rationale: 'Address catastrophic thinking patterns contributing to anxiety',
      },
    ],
    riskAssessment: {
      currentLevel: 'NONE',
      factors: [],
    },
    progressNotes: {
      summary: 'Client engaged well in initial sessions. Receptive to CBT techniques.',
      recentChanges: ['Introduced thought records', 'Discussed workplace triggers'],
      nextSteps: ['Practice cognitive restructuring', 'Sleep hygiene education'],
    },
    homework: [
      {
        id: 'hw-1',
        task: 'Complete daily thought record',
        purpose: 'Build awareness of anxiety patterns',
        status: 'Assigned',
      },
    ],
    sessionHistory: [
      { sessionNumber: 1, date: session1.scheduledAt.toISOString(), keyPoints: ['Intake', 'Assessment'] },
      { sessionNumber: 2, date: session2.scheduledAt.toISOString(), keyPoints: ['CBT intro', 'Panic discussion'] },
    ],
  };

  const clientView = {
    header: {
      greeting: 'Hi Alex! Here\'s your personalized treatment plan.',
      lastUpdated: new Date().toISOString(),
    },
    overview: {
      whatWeAreWorkingOn:
        "We're working together to help you manage anxiety and feel more in control at work and in daily life.",
      whyThisMatters:
        'By learning new skills to handle worried thoughts and physical symptoms, you\'ll be able to enjoy life more fully.',
      yourStrengths: [
        'You have a supportive partner in Jamie',
        'You\'re motivated to make positive changes',
        'You\'re willing to try new approaches',
      ],
    },
    goals: [
      {
        id: 'g-1',
        title: 'Feel calmer at work',
        description: 'Reduce those overwhelming moments when anxiety spikes',
        progress: 25,
        celebration: 'You\'re already making progress by learning new techniques!',
      },
      {
        id: 'g-2',
        title: 'Build your coping toolkit',
        description: 'Learn strategies you can use anytime, anywhere',
        progress: 10,
      },
    ],
    nextSteps: [
      { step: 'Practice noticing worried thoughts', why: 'Awareness is the first step to change' },
      { step: 'Try the breathing exercise we discussed', why: 'It helps calm your nervous system' },
    ],
    homework: [
      {
        id: 'hw-1',
        title: 'Thought Record',
        description: 'When you notice anxiety, jot down what you were thinking',
        tip: 'Keep it simple - even a few words counts!',
        status: 'Assigned',
      },
    ],
    encouragement: {
      progressMessage:
        'You\'re doing great by showing up and trying new things. Change takes time, and you\'re on the right path!',
    },
  };

  const plan = await prisma.treatmentPlan.create({
    data: {
      clientId: clientUser.client!.id,
      status: 'ACTIVE',
      currentVersion: 1,
      canonicalPlan: canonicalPlan,
      therapistView: therapistView,
      clientView: clientView,
      lastGeneratedAt: new Date(),
      publishedAt: new Date(),
      versions: {
        create: {
          versionNumber: 1,
          sessionId: session2.id,
          canonicalPlan: canonicalPlan,
          therapistView: therapistView,
          clientView: clientView,
          changeType: 'initial',
          changeSummary: 'Initial treatment plan generated from intake sessions',
          createdBy: therapistUser.id,
        },
      },
    },
  });

  console.log(`  ✓ Created treatment plan for ${clientUser.firstName}`);

  // Create homework entry linked to plan
  await prisma.homework.create({
    data: {
      planId: plan.id,
      title: 'Daily Thought Record',
      description:
        'Track your anxious thoughts throughout the day. Note the situation, your thoughts, and how you felt.',
      instructions:
        '1. When you notice anxiety, pause\n2. Write down what happened\n3. Write the thought that went through your mind\n4. Rate your anxiety 1-10\n5. Try to identify any thinking patterns',
      status: 'ASSIGNED',
      order: 1,
    },
  });

  console.log('  ✓ Created homework assignments');

  // Create audit log entries
  await prisma.auditLog.createMany({
    data: [
      {
        userId: therapistUser.id,
        action: 'CREATE',
        entityType: 'Client',
        entityId: clientUser.client!.id,
        metadata: { source: 'seed' },
      },
      {
        userId: therapistUser.id,
        action: 'GENERATE_PLAN',
        entityType: 'TreatmentPlan',
        entityId: plan.id,
        metadata: { source: 'seed', version: 1 },
      },
    ],
  });

  console.log('  ✓ Created audit log entries');

  console.log('\n✅ Seed completed successfully!\n');
  console.log('Demo Accounts:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Therapist: therapist@tavahealth.demo / therapist123');
  console.log('Client:    client@tavahealth.demo / client123');
  console.log('Client 2:  client2@tavahealth.demo / client456');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

