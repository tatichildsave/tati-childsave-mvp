/**
 * Facilitator Guide Configuration Layer
 *
 * Provides facilitator-specific content and guidance for each activity in the TATI curriculum.
 * This layer is separate from the learner curriculum to keep learning content clean and focused
 * on child experience, while adding facilitator support without duplicating curriculum data.
 *
 * Each guide maps to a TrackItem and provides:
 * - Purpose: Why this activity matters (facilitator-friendly language)
 * - Materials & prep: What facilitators need before the session
 * - Opening: Suggested introduction and opening question
 * - Instructions: Clear learner activity description
 * - Observation: What to look for (non-judgmental)
 * - Discussion: Post-activity reflection prompts
 * - Key learning: Facilitator's core takeaway
 * - Support: How to help stuck or early-finishing learners
 */

export interface FacilitatorGuide {
  /** Activity ID from track sequence (e.g., "meet-your-money") */
  activityId: string;

  /** Activity kind: lesson, scenario, assessment, or reflection */
  kind: "lesson" | "scenario" | "assessment" | "reflection";

  /**
   * Why this activity matters to facilitators
   * Use: Facilitator-friendly language, benefit to learner, connection to goals
   * Keep: 2-3 sentences max
   */
  purpose: string;

  /**
   * Materials and preparation checklist
   * Example: "Learners' devices", "TATI access", "15 minutes"
   */
  materials?: string[];

  /**
   * Preparation steps for facilitator
   * Example: "1. Make sure learners can access TATI.\n2. Briefly introduce today's topic."
   */
  preparation?: string;

  /**
   * Opening narration or message
   * What facilitator should say to introduce the activity
   * Keep: Warm, brief, motivating
   */
  opening: string;

  /**
   * Optional opening discussion question to spark engagement
   * Encourages thinking before starting the activity
   */
  openingQuestion?: string;

  /**
   * Clear description of what learners should do
   * Reference the actual activity steps
   */
  learnerInstructions: string;

  /**
   * What facilitator should look for while learners work
   * Frame as observations, NOT judgments or grades
   * Example: "Learners who pause to consider multiple choices"
   */
  observationPoints: string[];

  /**
   * Discussion/debrief prompts after activity
   * 3-5 prompts to encourage reflection
   * Open-ended questions, not test questions
   */
  discussionPrompts: string[];

  /**
   * Facilitator's key learning from this activity
   * What this activity is fundamentally teaching
   * Keep: 1-2 sentences, factual where appropriate
   */
  keyLearning: string;

  /**
   * Tips for supporting learners who are stuck
   * Example: "Ask them to explain what they're considering. Encourage review of the scenario."
   */
  supportIfStuck?: string;

  /**
   * Optional extension for learners who finish early
   * Keep: Lightweight, related to the activity
   */
  extensionPrompt?: string;

  /**
   * Estimated duration in minutes (can override content metadata)
   */
  estimatedMinutes?: number;
}

/**
 * Facilitator Guides for SAVE Track
 *
 * These guides support facilitators in understanding and facilitating each activity
 * in the TATI ChildSave SAVE track. Guides are linked to TrackItem IDs.
 */
export const facilitatorGuides: Record<string, FacilitatorGuide> = {
  "save-pre": {
    activityId: "save-pre",
    kind: "assessment",
    purpose:
      "This check-in helps you understand how each learner currently thinks about money. It's not a test—there are no right or wrong answers. The responses will help you tailor your support.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Ensure all learners can access TATI.\n2. Remind them this check-in is about their current thinking, not being right or wrong.",
    opening:
      "Today we're going to start our money journey together. First, I want to understand how you already think about money. This helps me support you better.",
    learnerInstructions:
      "1. Open the check-in activity.\n2. Read each question carefully.\n3. Choose the option that matches how you think right now.\n4. Answer honestly—this helps me know where to start.",
    observationPoints: [
      "Learners who hesitate between options—they're thinking deeply",
      "Learners who answer quickly and confidently",
      "Any learners who need clarification on what a question means",
    ],
    discussionPrompts: [
      "What was one question that made you think?",
      "Did any option surprise you?",
      "How do you feel about money decisions right now?",
    ],
    keyLearning: "Understanding learner's existing beliefs helps you meet them where they are.",
    supportIfStuck:
      "If a learner is uncertain, ask: 'What do you think this question is asking?' Help them rephrase in their own words, then encourage them to pick the answer closest to their thinking.",
    estimatedMinutes: 5,
  },

  "meet-your-money": {
    activityId: "meet-your-money",
    kind: "lesson",
    purpose:
      "This lesson introduces learners to the four superpowers of money: save, spend, share, and plan. It's the foundation for all money decisions throughout the journey. By the end, learners should know that money is a tool with multiple uses, not just for buying things.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Ensure TATI is accessible on all devices.\n2. Briefly explain: 'Money isn't one thing—it can do different things depending on what we choose.'",
    opening:
      "Today we're going to meet the four superpowers that every cedi has. These four powers help us understand what we can do with our money. Let's explore them together.",
    openingQuestion: "What's one thing you can do with money you have right now?",
    learnerInstructions:
      "1. Open the lesson 'Meet Your Money.'\n2. Tap each superpower card to see what it does.\n3. Read the examples from children in Ghana.\n4. Think about which superpower you use most often.\n5. Answer the knowledge check question.\n6. Share your reflection on which superpower matters to you.",
    observationPoints: [
      "Learners connecting the four powers to their own money choices",
      "Learners asking questions about the examples",
      "Learners who recognize themselves in the Ghanaian characters",
    ],
    discussionPrompts: [
      "Which superpower do you use most right now?",
      "What's an example of each superpower from your own life?",
      "Is there a superpower you want to use more often?",
      "How is 'share' different from 'spend'?",
    ],
    keyLearning:
      "Money isn't just for spending. Every cedi can save, spend, share, or help us plan. Knowing these four powers helps learners make choices that match their values.",
    supportIfStuck:
      "If a learner is confused about a power, use a real example: 'Spending is buying something for yourself. Sharing is buying something to help someone else. Which superpower is that?'",
    extensionPrompt:
      "If someone gave you GH₵50, how would you split it between the four superpowers? Why?",
    estimatedMinutes: 4,
  },

  "set-a-goal": {
    activityId: "set-a-goal",
    kind: "lesson",
    purpose:
      "This lesson helps learners commit to a savings goal—the School Bag Challenge (GH₵80). Having a clear, specific goal is fundamental to the entire journey. This lesson also introduces learners to the idea that a goal makes decisions easier.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Make sure all learners can access TATI.\n2. Have the goal (GH₵80 for a school bag) visible so learners know what they're saving toward.",
    opening:
      "Now that we know what money can do, let's decide what we want to save for. We're going to set a goal together: an Oxford blue school bag that costs GH₵80. This goal will guide all our decisions for the next 14 days.",
    openingQuestion:
      "If you wanted to buy something you really wanted, how would you plan to get it?",
    learnerInstructions:
      "1. Open the lesson 'Set a Goal.'\n2. Think about why having a savings goal matters.\n3. Commit to the GH₵80 school bag goal.\n4. Understand that this goal will help guide your choices over the next two weeks.",
    observationPoints: [
      "Learners who express confidence about reaching the goal",
      "Learners who seem uncertain or hesitant",
      "Learners asking clarifying questions about what GH₵80 means or what the bag is",
    ],
    discussionPrompts: [
      "Do you think it's possible to save GH₵80 in 14 days? Why or why not?",
      "How might having a goal help you make decisions?",
      "What choices might you need to make to reach this goal?",
      "What's something you're willing to give up to reach your goal?",
    ],
    keyLearning:
      "A clear, specific goal transforms abstract 'saving' into concrete action. When learners can visualize what they're saving for, they stay motivated.",
    supportIfStuck:
      "If a learner thinks GH₵80 is impossible, ask: 'What if you earned money this week, saved part of it, and earned more next week? Could you get there then?' Help them break it into steps.",
    extensionPrompt:
      "Besides the school bag, what's another goal you might save for? How long do you think that would take?",
    estimatedMinutes: 5,
  },

  "kwame-request--ch1": {
    activityId: "kwame-request--ch1",
    kind: "scenario",
    purpose:
      "This scenario kicks off the story: learners now have GH₵50 and must make their first real decision—how much to save versus keep available. It introduces the tension between security (saving) and flexibility (pocket money). Learners see consequences of their choices without judgment.",
    materials: ["Learners' devices", "TATI access", "20 minutes"],
    preparation:
      "1. Ensure learners can access TATI.\n2. Explain: 'In this story, you have a real amount of money (GH₵50) and real decisions to make. There are no wrong answers—only choices and what happens because of them.'",
    opening:
      "Now we're stepping into your story. You have GH₵50 in your hand. School reopens in 14 days. You want that GH₵80 school bag. Let's see what happens when you make your first money decision.",
    openingQuestion: "If you had GH₵50 right now, how much would you put away for safekeeping?",
    learnerInstructions:
      "1. Open 'Days 1–2: Plan and Earn.'\n2. Decide how much of your GH₵50 to save (put in a box).\n3. Think about why you made that choice.\n4. See what happens next—you get a chance to earn more money.\n5. Notice the consequences of your first decision.",
    observationPoints: [
      "Learners who carefully think through their decision",
      "Learners who explain their reasoning out loud",
      "Learners who notice the trade-off between saving and pocket flexibility",
      "Any learners who want to change their decision after seeing consequences",
    ],
    discussionPrompts: [
      "Why did you choose to save that amount?",
      "What happened because of your choice?",
      "If you could go back, would you decide differently? Why?",
      "What surprised you about the consequences?",
      "How did it feel to make a real decision about money?",
    ],
    keyLearning:
      "Every money decision has consequences. Learners don't need to be 'right'—they need to notice what happened because of their choice and think about whether they want the same outcome next time.",
    supportIfStuck:
      "If a learner is paralyzed by the choice, ask: 'What if you put GH₵40 away? What would be good about that? What would be hard?' Help them think through the trade-offs.",
    extensionPrompt:
      "What if you had GH₵100 instead of GH₵50? Would you make the same choice? Why or why not?",
    estimatedMinutes: 15,
  },

  "needs-vs-wants": {
    activityId: "needs-vs-wants",
    kind: "lesson",
    purpose:
      "This lesson teaches learners to distinguish between needs (what you must have to be healthy and safe) and wants (what you'd like to have). This skill becomes critical as learners face temptation in the scenario. Without this framework, spending feels impulsive.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Prepare to help learners see that 'need vs want' isn't always obvious—context matters. A pencil might be a need before exams but a want before term starts.",
    opening:
      "In the next part of your story, you'll have a choice: spend on a need, or spend on a want, or save for your goal. To make smart choices, you need to know the difference.",
    openingQuestion:
      "Is an exercise book a need or a want? What about a phone? A sticker? How do you decide?",
    learnerInstructions:
      "1. Open the lesson 'Need or Want.'\n2. Sort items into needs and wants.\n3. Notice that sometimes it depends on the situation.\n4. Think about how understanding this helps you with money.",
    observationPoints: [
      "Learners debating whether something is a need or want",
      "Learners recognizing context ('I need a pencil before school, but after school it's a want')",
      "Learners connecting this lesson to their own choices",
    ],
    discussionPrompts: [
      "What's something that's a need for you right now?",
      "What's something that's a want?",
      "Can the same thing be both? When?",
      "How does knowing the difference help you with your goal?",
    ],
    keyLearning:
      "Understanding needs vs wants empowers learners to make conscious spending decisions. It's not about never buying wants—it's about choosing purposefully.",
    supportIfStuck:
      "Ask: 'Do you need this to be healthy and safe, or do you want it because it seems fun or cool?' That simple test often clarifies.",
    extensionPrompt:
      "Look at five items around you. Decide whether each is a need or want. Then ask: can a need become a want if you already have one?",
    estimatedMinutes: 5,
  },

  "stop-think-choose": {
    activityId: "stop-think-choose",
    kind: "lesson",
    purpose:
      "This lesson teaches the TATI signature decision-making framework: Stop (pause before spending), Think (consider the impact), Choose (decide consciously). This mental model empowers learners to control impulse spending and align choices with their goal.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Make sure TATI is accessible.\n2. Explain: 'Impulse spending happens when we don't pause. This lesson gives you a tool to stay in control.'",
    opening:
      "You're going to meet the TATI way to decide: Stop, Think, Choose. This simple framework helps you make choices that match your goal instead of feeling like money just disappears.",
    openingQuestion:
      "When was the last time you spent money without thinking? How did you feel afterward?",
    learnerInstructions:
      "1. Open 'Stop, Think, Choose.'\n2. Learn what each step means.\n3. Practice the framework with example scenarios.\n4. Reflect on how it helps you stay on course.",
    observationPoints: [
      "Learners who can articulate the three steps in their own words",
      "Learners applying it to personal examples",
      "Learners recognizing when they could have used this tool",
    ],
    discussionPrompts: [
      "When is the best time to STOP before spending?",
      "What SHOULD you think about when you have a choice?",
      "How does CHOOSING consciously feel different from impulsive spending?",
      "Can you think of a time today you could have used Stop-Think-Choose?",
    ],
    keyLearning:
      "A simple decision framework transforms spending from reactive to intentional. When learners pause, they're more likely to choose in alignment with their values and goals.",
    supportIfStuck:
      "Use a real scenario: 'Your friend wants you to go buy snacks. STOP—pause for a second. THINK—will this help your goal? Will you still save what you planned? CHOOSE—what do you do?' Work through it together.",
    extensionPrompt:
      "Design your own Stop-Think-Choose card or poster. What would you draw for each step? What reminder would help you remember?",
    estimatedMinutes: 5,
  },

  "kwame-request--ch2": {
    activityId: "kwame-request--ch2",
    kind: "scenario",
    purpose:
      "In this scenario, learners face their first real temptation: items they want are available at the market, and they must choose between competing uses for their money. This decision point tests whether the lessons about needs, wants, and the Stop-Think-Choose framework stick.",
    materials: ["Learners' devices", "TATI access", "20 minutes"],
    preparation:
      "1. Ensure TATI access is ready.\n2. Say: 'This is where your learning gets tested. You'll have real choices to make.'",
    opening:
      "The market stall is open. An exercise book, a toffee, and your school bag goal are all asking for the same cedis. What do you do? Let's see your choices play out.",
    openingQuestion:
      "When you have to choose between something you want and your goal, how do you decide?",
    learnerInstructions:
      "1. Open 'Day 4: The Market Stall.'\n2. You have pocket money at the market.\n3. Make choices about what to buy.\n4. See the consequences and keep moving forward.",
    observationPoints: [
      "Learners using the Stop-Think-Choose framework",
      "Learners reflecting on their spending choices",
      "Learners understanding the trade-off between impulse and goal",
    ],
    discussionPrompts: [
      "What did you buy at the market? Why?",
      "Do you think it was a need or a want?",
      "How does that choice affect your goal?",
      "If you played this again, would you choose differently?",
      "What was the hardest part of this decision?",
    ],
    keyLearning:
      "In real life, temptation will come. Learners who can consciously choose between impulse and goal are building the core skill of intentional spending.",
    supportIfStuck:
      "If a learner is unsure, ask: 'What would the STOP-THINK-CHOOSE framework tell you to do?' Help them walk through it step by step.",
    extensionPrompt:
      "Imagine you had GH₵50 instead of your current pocket money. How would that change your choices at the market?",
    estimatedMinutes: 15,
  },

  "reflect-choices": {
    activityId: "reflect-choices",
    kind: "reflection",
    purpose:
      "This reflection prompt invites learners to name what was 'loudest in their head' at the market—fear, excitement, self-doubt, determination? Reflection deepens awareness of the emotional dimension of money choices.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Remind learners: 'This is just about noticing your feelings. There are no wrong feelings.'",
    opening:
      "Let's pause for a moment. When you were at the market, what was loudest in your head? Was it the voice saying 'Get the toffee'? The voice saying 'Stay focused on your goal'? Something else? Let's talk about it.",
    learnerInstructions:
      "1. Open the reflection prompt.\n2. Think about the emotions you felt at the market.\n3. Answer honestly about what influenced your choices.\n4. Consider what you learned about yourself.",
    observationPoints: [
      "Learners being honest about emotional drivers",
      "Learners connecting emotions to choices",
      "Self-awareness emerging in their responses",
    ],
    discussionPrompts: [
      "What feeling was the loudest?",
      "Did that feeling help you or get in your way?",
      "What would your quieter voice say?",
      "How can you listen to your goal-voice more often?",
    ],
    keyLearning:
      "Money decisions aren't just logical—emotions drive them. Learners who recognize their emotional patterns can manage their spending more consciously.",
    supportIfStuck:
      "Ask: 'When you thought about buying the toffee, how did your body feel? Excited? Guilty? Torn?' Help name the emotion, then ask how it affected their choice.",
    estimatedMinutes: 5,
  },

  "borrow-and-lend": {
    activityId: "borrow-and-lend",
    kind: "lesson",
    purpose:
      "This lesson teaches the '4 Smart Questions' to ask before lending money to friends: Can I afford to lose it? Will I need it back soon? Do I trust this person? Is this the right time? This framework protects learners' savings and friendships.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Explain: 'This is about friendship AND money safety. Sometimes helping a friend means saying no.'",
    opening:
      "Friends are going to ask to borrow money. Saying yes feels kind. But it can also jeopardize your goal. Let's learn how to be a good friend AND protect your savings.",
    openingQuestion: "Has a friend ever asked to borrow money from you? What did you do?",
    learnerInstructions:
      "1. Open 'Borrow and Lend.'\n2. Learn the 4 Smart Questions.\n3. Practice deciding whether to lend in example scenarios.\n4. Understand that 'no' can be the most helpful answer sometimes.",
    observationPoints: [
      "Learners grasping that lending isn't just generosity—it's a financial decision",
      "Learners recognizing the risk involved",
      "Learners seeing that protecting their goal is okay",
    ],
    discussionPrompts: [
      "What are the 4 Smart Questions?",
      "When would it be safe to lend money?",
      "When would it NOT be safe?",
      "How can you say no to a friend kindly?",
      "What if your friend gets upset?",
    ],
    keyLearning:
      "True friendship doesn't require losing your savings. A framework for lending protects both the friendship and the learner's financial security.",
    supportIfStuck:
      "Use a concrete example: 'Your best friend asks for GH₵5 for lunch. Your rule is: Can I afford to lose it? What's your answer? Why?'",
    extensionPrompt:
      "What would you do if your friend couldn't pay back a loan? How would you handle it?",
    estimatedMinutes: 5,
  },

  "money-safety": {
    activityId: "money-safety",
    kind: "lesson",
    purpose:
      "This lesson teaches how to physically protect savings from loss, theft, and accidents. It's practical and grounding—learners consider realistic risks (torn notes, theft, water damage) and solutions (where to store money safely).",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Explain: 'Your money needs protection just like you do. This lesson is about practical safety.'",
    opening:
      "You're saving money for a goal. But what if it rips? What if someone takes it? What if it gets wet? This lesson is about keeping your cedis safe.",
    learnerInstructions:
      "1. Open 'Money Safety.'\n2. Learn what can damage money and what can't.\n3. Explore safe storage options.\n4. Make a plan for protecting YOUR savings.",
    observationPoints: [
      "Learners thinking seriously about storage options",
      "Learners identifying realistic risks",
      "Learners making practical plans",
    ],
    discussionPrompts: [
      "What are ways money can be lost or damaged?",
      "Where do you think is safest to keep your savings?",
      "What would you do if something happened to your money?",
      "Is it safe to keep all your money in one place?",
      "How would you show someone your savings are protected?",
    ],
    keyLearning:
      "Protecting savings requires thinking through real-world risks. Learners who have a deliberate safety plan are more likely to keep their commitments.",
    supportIfStuck:
      "Ask: 'Where do your parents keep important things? Why do they keep them there? Could you do something similar?'",
    extensionPrompt:
      "Design a 'safe box' or 'safe spot' for your savings. Draw it or describe it. What makes it safe?",
    estimatedMinutes: 4,
  },

  "kwame-request--ch3": {
    activityId: "kwame-request--ch3",
    kind: "scenario",
    purpose:
      "In this scenario, learners face two real dilemmas: (1) A classmate asks for lunch money, and (2) They must choose where to store their savings (at home, with a trusted adult, at a bank?). These decisions integrate the lessons on lending, friendship, and money safety.",
    materials: ["Learners' devices", "TATI access", "20 minutes"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Say: 'You're going to make two big decisions. Both have real consequences.'",
    opening:
      "Kwame is hungry and asks for lunch money. Meanwhile, you need to decide: where should your savings sleep at night? Let's walk through these decisions together.",
    openingQuestion: "If a classmate was really hungry, would you help them? How would you decide?",
    learnerInstructions:
      "1. Open 'Days 6–7: Kwame Asks and Money Needs a Home.'\n2. Respond to Kwame's request using the Smart Questions framework.\n3. Choose a safe place for your savings.\n4. See what happens next.",
    observationPoints: [
      "Learners applying the lending framework thoughtfully",
      "Learners considering safety options carefully",
      "Learners reflecting on the tension between helping and protecting their goal",
    ],
    discussionPrompts: [
      "Why did you decide what you did about Kwame?",
      "Where did you put your savings? Why?",
      "How did each choice feel?",
      "What would you do if you played this again?",
      "What surprised you in this story?",
    ],
    keyLearning:
      "Learners are discovering that money decisions involve both head (strategy) and heart (compassion). Real wisdom is holding both.",
    supportIfStuck:
      "Break it into two separate decisions. First: 'Can you afford to help Kwame without losing your goal?' Then: 'Where is your money safest?'",
    extensionPrompt:
      "If Kwame couldn't pay back the lunch money, what would you do? What does that teach you about lending?",
    estimatedMinutes: 15,
  },

  "reflect-lending": {
    activityId: "reflect-lending",
    kind: "reflection",
    purpose:
      "This reflection asks learners to process the emotional fallout of their lending decision. Did they feel good about helping? Guilty? Worried about getting the money back? Reflection normalizes the complexity of money and friendship.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Remind learners: 'There's no 'right' feeling here. Just your honest reaction.'",
    opening:
      "Let's think about how your decision about Kwame felt. If you helped him, did it feel good or did you worry? If you said no, did you feel guilty? Let's talk about it.",
    learnerInstructions:
      "1. Open the reflection.\n2. Think about how your decision made you feel.\n3. Answer the prompt honestly.\n4. Recognize that helping and protecting yourself aren't opposites.",
    observationPoints: [
      "Learners being honest about guilt, pride, worry, relief",
      "Learners recognizing the emotional complexity of money",
      "Learners accepting that their feelings are valid",
    ],
    discussionPrompts: [
      "How did your decision about Kwame make you feel?",
      "Was that feeling what you expected?",
      "If you felt guilty about saying no, what does that tell you about yourself?",
      "Is there a way to help Kwame AND protect your goal?",
      "What would you do if you played it again?",
    ],
    keyLearning:
      "Processing feelings about money choices—guilt, pride, worry, relief—helps learners build emotional resilience and moral clarity.",
    supportIfStuck:
      "Ask: 'Did your heart and your goal agree with each other? What does that feel like?' Validate whatever they experienced.",
    estimatedMinutes: 5,
  },

  "where-to-save": {
    activityId: "where-to-save",
    kind: "lesson",
    purpose:
      "This lesson compares different saving options: a box at home, a trusted adult's safekeeping, a moneylender, a bank account. Learners understand that 'safe' means different things depending on context, and that banks and formal systems have advantages.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Explain: 'There's no one right answer, but some places are safer than others. This lesson helps you decide.'",
    opening:
      "We've talked about keeping money safe. But WHERE? In a box? With Auntie? At a bank? Each choice has pros and cons. Let's explore them.",
    learnerInstructions:
      "1. Open 'Where to Save.'\n2. Learn about different storage options.\n3. Understand the trade-offs (accessibility vs. security, etc.).\n4. Think about what works best for you.",
    observationPoints: [
      "Learners comparing options thoughtfully",
      "Learners understanding why banks exist",
      "Learners making realistic choices based on their context",
    ],
    discussionPrompts: [
      "What are the good things about each savings option?",
      "What's risky about each one?",
      "Which one would YOU choose? Why?",
      "What if you needed your money urgently? What would you do?",
      "Is a bank an option where you live?",
    ],
    keyLearning:
      "Safe saving isn't one-size-fits-all. Understanding options empowers learners to make choices that work for them and their context.",
    supportIfStuck:
      "Use local examples: 'Where do people in your community save? What's good about that place? What's risky?'",
    extensionPrompt:
      "Interview someone you trust about where THEY save. What do they like about their choice? What worries them?",
    estimatedMinutes: 5,
  },

  "little-by-little": {
    activityId: "little-by-little",
    kind: "lesson",
    purpose:
      "This lesson celebrates earning through small, honest work: chores, errands, small jobs. Learners understand that saving GH₵80 is possible not just by protecting money but by earning more. This lesson also builds pride in honest work.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Explain: 'Reaching your goal isn't just about not spending. It's also about earning through work you're proud of.'",
    opening:
      "Let's talk about earning. You can shell groundnuts, run errands, help with chores. Little by little, these small jobs add up to real cedis for your goal.",
    openingQuestion: "What small jobs or chores could you do to earn money?",
    learnerInstructions:
      "1. Open 'Little by Little.'\n2. Explore examples of honest work children can do.\n3. Understand how multiple small earnings add up.\n4. Think about what you could do.",
    observationPoints: [
      "Learners recognizing opportunities around them",
      "Learners feeling capable of earning",
      "Learners connecting work to progress toward their goal",
    ],
    discussionPrompts: [
      "What's one job you could start today?",
      "How much could you earn from it?",
      "How many jobs would you need to reach your goal?",
      "What's good about earning versus just saving?",
      "What job makes you feel most proud?",
    ],
    keyLearning:
      "Reaching savings goals is a combination of protecting money AND earning through honest work. Both matter, and both build competence and pride.",
    supportIfStuck:
      "Brainstorm together: 'What does your family or community need help with? What could you be paid for?' Help connect possibility to action.",
    extensionPrompt:
      "Create a list of 5 jobs you could do and how much you'd earn from each. What would be your strategy to reach GH₵80?",
    estimatedMinutes: 5,
  },

  "kwame-request--ch4": {
    activityId: "kwame-request--ch4",
    kind: "scenario",
    purpose:
      "In this scenario, learners earn money through jobs, face repayment of an earlier debt, and encounter an unexpected expense (torn sandal). These overlapping challenges integrate earning, budgeting, and handling surprises—the reality of money management.",
    materials: ["Learners' devices", "TATI access", "20 minutes"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Say: 'This part gets complicated. You're earning, paying back, AND dealing with an unexpected problem. Sound familiar?'",
    opening:
      "Now you're working for cedis. But life isn't simple: you might owe money, and surprise expenses come up. Let's walk through Days 8–10 together.",
    learnerInstructions:
      "1. Open 'Days 8–10: Buckets, Repayment, and a Torn Sandal.'\n2. Take jobs to earn money.\n3. Handle repayment of earlier promises.\n4. Deal with an unexpected expense.\n5. Keep your goal in view.",
    observationPoints: [
      "Learners prioritizing among competing needs (earning, repayment, emergency)",
      "Learners thinking through trade-offs",
      "Learners staying committed to their goal despite complications",
    ],
    discussionPrompts: [
      "Which job did you take? Why?",
      "How did you handle the repayment?",
      "What did you decide about the torn sandal?",
      "Did that decision affect your goal?",
      "If you could do it over, what would you change?",
    ],
    keyLearning:
      "Real money management involves juggling: earning, obligations, surprises, and long-term goals. Learners who practice this complexity build genuine resilience.",
    supportIfStuck:
      "Help them see the interconnection: 'If you earn GH₵15 and spend GH₵8 on the sandal, what's left? Does that still move you toward your goal?'",
    extensionPrompt:
      "What if the sandal cost GH₵20 instead of GH₵8? Would your choices change? How would you handle it?",
    estimatedMinutes: 15,
  },

  "track-money": {
    activityId: "track-money",
    kind: "lesson",
    purpose:
      "This lesson introduces the practical skill of recording every transaction in a simple ledger. Tracking isn't punishment—it's the foundation of control. When learners can see where money goes, they understand patterns and can plan better.",
    materials: [
      "Learners' devices",
      "TATI access",
      "Optional: paper and pencil for ledger practice",
    ],
    preparation:
      "1. Ensure TATI is accessible.\n2. Explain: 'Tracking money is like a map. It shows you where you've been and helps you plan where you're going.'",
    opening:
      "You've been earning, spending, and saving. But do you know exactly where every cedi went? Let's learn to track money with a simple notebook system.",
    learnerInstructions:
      "1. Open 'Track Money.'\n2. Learn the simple ledger format.\n3. Practice recording sample transactions.\n4. Understand why tracking matters.",
    observationPoints: [
      "Learners finding the ledger system easy or complex (note this for support)",
      "Learners seeing patterns in their spending as they record",
      "Learners recognizing the power of visible records",
    ],
    discussionPrompts: [
      "When you record where money went, what do you notice?",
      "Are there any surprises?",
      "How does tracking help you reach your goal?",
      "What would you do if you saw you were spending more than expected?",
      "Is tracking something you'd keep doing after this challenge?",
    ],
    keyLearning:
      "Visible records of money movement transform abstract spending into concrete awareness. Tracking is the bridge between intention and reality.",
    supportIfStuck:
      "Start simple: 'Just record: Amount, What I spent it on, Date. That's it. Do three transactions together, then they try one.'",
    extensionPrompt:
      "Track your spending for one full day—every cedi that leaves your hand. What did you learn?",
    estimatedMinutes: 4,
  },

  "when-plans-change": {
    activityId: "when-plans-change",
    kind: "lesson",
    purpose:
      "This lesson teaches adaptive planning: school calendars change, jobs fall through, prices go up. Rather than abandoning the goal when plans shift, learners learn to pause, reassess, and adjust their strategy while staying committed.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Explain: 'The world isn't predictable. But you can still reach your goal even when things change. This lesson shows you how.'",
    opening:
      "We're almost at the finish line. But what if school reopens earlier than expected? What if a job opportunity disappears? What if prices change? This lesson is about staying flexible while staying focused.",
    learnerInstructions:
      "1. Open 'When Plans Change.'\n2. Learn the framework for adjusting your plan.\n3. Practice responding to different scenarios.\n4. Understand that flexibility is strength, not failure.",
    observationPoints: [
      "Learners staying calm when plans change",
      "Learners problem-solving rather than giving up",
      "Learners recognizing that adjusting ≠ quitting",
    ],
    discussionPrompts: [
      "What's a change you've experienced with your money?",
      "How did it affect your plan?",
      "What did you do?",
      "Can you think of other changes that might happen?",
      "How would you handle them?",
    ],
    keyLearning:
      "Resilience isn't about never having plans disrupted—it's about adapting without losing sight of the goal. Flexibility and commitment can coexist.",
    supportIfStuck:
      "Use a practical example: 'Your job falls through. You were counting on GH₵20. But school is in 6 days. What would you do?' Work through the adjustment together.",
    extensionPrompt:
      "If you reached your goal of GH₵80 but spent half of it unexpectedly, what would you do? Would you start saving again? Why or why not?",
    estimatedMinutes: 5,
  },

  "kwame-request--ch5": {
    activityId: "kwame-request--ch5",
    kind: "scenario",
    purpose:
      "This is the grand finale: learners face one last earning opportunity, a tempting purchase (jersey at Makola), and the moment of truth—going to market to buy the school bag. The scenario brings all previous lessons together and culminates in the achievement.",
    materials: ["Learners' devices", "TATI access", "20 minutes"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Say: 'This is your final chapter. Everything you've learned comes together now. Let's see if you reach your goal.'",
    opening:
      "School reopens in 4 days. You have one last chance to earn, but temptation is calling—a jersey at Makola would look amazing. And then, the market. This is it.",
    learnerInstructions:
      "1. Open 'Days 11–14: School Reopening.'\n2. Take your final earning opportunity.\n3. Make a final spending decision.\n4. Go to market and complete your goal or reflect on what you learned.",
    observationPoints: [
      "Learners showing commitment (or ambivalence) to their goal",
      "Learners making consciously intentional final choices",
      "Learners celebrating or processing the outcome",
    ],
    discussionPrompts: [
      "Did you buy the jersey? Why or why not?",
      "Did you reach the GH₵80 goal?",
      "How do you feel about the outcome?",
      "What was the hardest part of this journey?",
      "What will you do differently next time you save for something?",
    ],
    keyLearning:
      "Reaching (or not reaching) a savings goal is less important than the learning along the way. Either way, learners have built skills and self-awareness.",
    supportIfStuck:
      "If they didn't reach the goal: 'You learned so much. What would you do differently? Can you finish your goal with one more job?' If they did: 'Celebrate! What was the moment you knew you'd make it?'",
    extensionPrompt:
      "Write a message to yourself 6 months from now about what you learned. What advice would you give?",
    estimatedMinutes: 15,
  },

  "reflect-journey": {
    activityId: "reflect-journey",
    kind: "reflection",
    purpose:
      "This final reflection invites learners to zoom out and ask: If the school term started again right now, what would I do differently? This metacognitive question consolidates learning and prepares them to apply it beyond the game.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Explain: 'This reflection is about what you learned about yourself and money. This knowledge goes with you forever.'",
    opening:
      "You've reached the end of your 14-day journey. Now imagine the clock resets and term starts again. What would you do differently? That answer is your real learning.",
    learnerInstructions:
      "1. Open the final reflection.\n2. Think deeply about what you'd do differently.\n3. Answer honestly and thoughtfully.\n4. Recognize what you learned about yourself.",
    observationPoints: [
      "Learners showing clear growth in thinking",
      "Learners naming specific skills they learned",
      "Learners ready to apply lessons in real life",
    ],
    discussionPrompts: [
      "What would you do differently?",
      "Why would you make that different choice?",
      "What's the biggest thing you learned?",
      "How will this change the way you think about money?",
      "What's the first thing you'd do with your next opportunity to save?",
    ],
    keyLearning:
      "Genuine learning transfers beyond the game. When learners can articulate what they'd do differently, they've internalized the lesson.",
    supportIfStuck:
      "Prompt them: 'Think about one decision from Days 1–14. If you could replay just that decision, what would you do?' That often clarifies what they learned.",
    estimatedMinutes: 5,
  },

  "money-plan": {
    activityId: "money-plan",
    kind: "lesson",
    purpose:
      "This bonus lesson teaches deliberate envelope-budgeting: dividing future income into Save, Spend, and Share percentages. It's a strategic skill for managing money beyond a single goal—a framework for life.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Explain: 'This is what adults do. You're learning to think like someone who keeps money under control.'",
    opening:
      "Now you know how to save for a specific goal. But what about ongoing money? This lesson teaches you how to divide every cedi you earn into Save, Spend, and Share.",
    learnerInstructions:
      "1. Open 'Money Plan.'\n2. Learn the envelope method.\n3. Decide your percentages for Save, Spend, and Share.\n4. Practice with example scenarios.",
    observationPoints: [
      "Learners grasping the concept of percentage allocation",
      "Learners making intentional choices about their values (how much to share?)",
      "Learners seeing this as a system they could use long-term",
    ],
    discussionPrompts: [
      "How much should you save from every cedi you earn?",
      "How much should you spend on yourself?",
      "How much should you share or give?",
      "Why is it helpful to decide this in advance?",
      "How would your plan change as you get older?",
    ],
    keyLearning:
      "Envelope budgeting is a powerful, simple tool. When learners allocate their future earnings intentionally, they move from reactive spending to strategic life planning.",
    supportIfStuck:
      "Use concrete numbers: 'If you earn GH₵50, and you want to save 40%, spend 50%, and share 10%, how much is each envelope?' Do the math together.",
    extensionPrompt:
      "Discuss with your family: How much do they save, spend, and share? Can you try the envelope method with your own money?",
    estimatedMinutes: 5,
  },

  "mobile-money": {
    activityId: "mobile-money",
    kind: "lesson",
    purpose:
      "This lesson explores digital wallets and mobile money services (like Vodafone Cash in Ghana). Learners see that saving can be physical (cash) or digital, and understand the advantages of digital systems: accessibility, safety, recording.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Explain: 'Phone money is real money. It's not a game. Let's see how it works and when it's useful.'",
    opening:
      "Many young people use their phones for money. Let's explore what mobile money is, how it works, and when it's a good option for saving.",
    learnerInstructions:
      "1. Open 'Mobile Money.'\n2. Learn what mobile money is and how it's used.\n3. See the pros and cons compared to physical saving.\n4. Understand who might use it and why.",
    observationPoints: [
      "Learners understanding digital money as real",
      "Learners comparing digital vs. physical trade-offs",
      "Learners recognizing innovation in their own context",
    ],
    discussionPrompts: [
      "What's good about mobile money?",
      "What's risky?",
      "Is it available where you live?",
      "Would you use it to save? Why or why not?",
      "How is it different from a bank?",
    ],
    keyLearning:
      "Digital money is part of the present and future. Learners who understand mobile money aren't left behind by financial innovation.",
    supportIfStuck:
      "Ask: 'Your phone can send and store money. How is that like a physical safe box? How is it different?'",
    extensionPrompt:
      "If you had a mobile money account, how would you use it? Would it help you reach goals faster?",
    estimatedMinutes: 4,
  },

  "bank-accounts": {
    activityId: "bank-accounts",
    kind: "lesson",
    purpose:
      "This lesson demystifies banks: what they do, how accounts work, savings rates, and how young people access banking. The goal is to see banks as institutions designed to help, not as intimidating places.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Explain: 'Banks can feel scary or fancy. But they're just places designed to keep your money safe and help it grow.'",
    opening:
      "Let's visit the bank. Not literally—virtually. We're going to see how banks work and whether a bank account might be useful for you.",
    learnerInstructions:
      "1. Open 'Bank Accounts.'\n2. Learn what banks do and why they exist.\n3. Understand how interest works.\n4. Explore the idea of a young person's account.",
    observationPoints: [
      "Learners losing fear or confusion about banks",
      "Learners seeing banks as a tool, not an intimidation",
      "Learners asking practical questions about how to open accounts",
    ],
    discussionPrompts: [
      "What does a bank do?",
      "Why would you put money in a bank instead of at home?",
      "What's interest?",
      "Is there a bank account young people can open?",
      "Would you want a bank account? Why or why not?",
    ],
    keyLearning:
      "Banks demystified are less scary. When learners understand banking basics, they have more options for where and how to save.",
    supportIfStuck:
      "Simplify: 'A bank is like a super-safe box that many people use. It also pays you a tiny bit extra (interest) for keeping money there.'",
    extensionPrompt:
      "Visit a real bank with an adult if possible. What did you see? How did it feel? Did the virtual lesson match reality?",
    estimatedMinutes: 5,
  },

  "smart-spending": {
    activityId: "smart-spending",
    kind: "lesson",
    purpose:
      "This bonus dilemma lesson presents a real-world temptation: a shiny football jersey at Makola market, and asks learners to think through the trade-off between impulse wants and their current goal. It reinforces Stop-Think-Choose in a high-temptation scenario.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Explain: 'This isn't a trick question. It's about knowing yourself and making intentional choices.'",
    opening:
      "You're at Makola market. You see a beautiful football jersey that costs GH₵40. You have GH₵50 left to reach your goal. What do you do? Let's explore the thinking.",
    learnerInstructions:
      "1. Open 'Smart Spending: The Jersey Dilemma.'\n2. Think through the choice carefully.\n3. Use Stop-Think-Choose.\n4. Consider what 'smart' means to you.",
    observationPoints: [
      "Learners wrestling with temptation realistically",
      "Learners applying frameworks they learned",
      "Learners comfortable with their choice (whatever it is)",
    ],
    discussionPrompts: [
      "Why do you want the jersey?",
      "What would it cost you if you bought it?",
      "Could you reach your goal another way?",
      "Or is the jersey more important than the goal?",
      "How do you feel about your decision?",
    ],
    keyLearning:
      "'Smart' isn't one-size-fits-all. Some learners will buy the jersey and be happy. Others will stay the course. Both are valid if the choice is intentional.",
    supportIfStuck:
      "Don't push them toward either answer. Ask: 'If you buy it, how will you feel? If you don't, how will you feel?' Let them choose based on their values.",
    extensionPrompt:
      "Is there a way to have both the jersey AND reach your goal? Could you earn more money? Could you buy the jersey after reaching the goal?",
    estimatedMinutes: 5,
  },

  "save-post": {
    activityId: "save-post",
    kind: "assessment",
    purpose:
      "This final check-in mirrors the pre-assessment but asks learners to reflect on how their thinking has changed. It's not a test with 'right' answers—it's a moment to recognize growth and consolidate learning.",
    materials: ["Learners' devices", "TATI access"],
    preparation:
      "1. Ensure TATI is accessible.\n2. Say: 'This is not a test. It's a chance to see how much you've grown.'",
    opening:
      "At the beginning, we asked how you think about money. Now you've learned so much. Let's see how your thinking has changed—or if it's stayed the same.",
    learnerInstructions:
      "1. Open the final check-in.\n2. Answer the questions about how you think about money NOW.\n3. Compare your answers to the beginning.\n4. Notice your growth.",
    observationPoints: [
      "Evidence of changed thinking (or confident consistency)",
      "Learners articulating their growth",
      "Learners ready to celebrate or reflect on their learning",
    ],
    discussionPrompts: [
      "How is your thinking about money different now?",
      "What changed the most?",
      "Do you feel more confident making money decisions?",
      "What will you do differently in real life?",
      "What's one thing you want to remember forever about saving?",
    ],
    keyLearning:
      "Recognizing growth builds confidence and commitment. When learners see how much they've learned, they're motivated to keep going.",
    supportIfStuck:
      "If they say 'I don't know,' prompt: 'At the beginning, would you have said that?' Help them see the contrast.",
    estimatedMinutes: 5,
  },
};
