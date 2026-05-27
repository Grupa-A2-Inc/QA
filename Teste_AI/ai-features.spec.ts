/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, Page, Route, test } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "https://frontend-teal-five-57.vercel.app";
const COURSE_ID = "course-ai-e2e";
const LESSON_ID = "lesson-text";
const TEST_ID = "test-ai-e2e";
const CHAT_TITLE = "AdaptiveTutor Support";
const MOJIBAKE_PATTERN = /Ã|Ä|È|â€”|â€“|â€™|ðŸ|â˜/;

type Role = "STUDENT" | "TEACHER" | "ORGANIZATION_ADMIN";
type CatalogSubject = { subject_id: number; name: string };
type CatalogTopic = { topic_id: number; subject_id: number; grade: number; name: string };

const catalogSubjects: CatalogSubject[] = [
  { subject_id: 1, name: "Limba si literatura romana" },
  { subject_id: 2, name: "Matematica" },
  { subject_id: 3, name: "Biologie" },
];

const catalogTopics: CatalogTopic[] = [
  { topic_id: 1001, subject_id: 1, grade: 9, name: "Norme ortografice si de punctuatie" },
  { topic_id: 1002, subject_id: 1, grade: 9, name: "Vocabular si sensuri ale cuvintelor" },
  { topic_id: 1003, subject_id: 1, grade: 9, name: "Comunicare orala si scrisa" },
  { topic_id: 1004, subject_id: 1, grade: 9, name: "Elemente de constructie a textului" },
  { topic_id: 1101, subject_id: 2, grade: 9, name: "Multimi de numere si operatii" },
  { topic_id: 1102, subject_id: 2, grade: 9, name: "Ecuatii si inecuatii" },
  { topic_id: 1103, subject_id: 2, grade: 9, name: "Functii si reprezentare grafica" },
  { topic_id: 1104, subject_id: 2, grade: 9, name: "Geometrie plana si relatii metrice" },
  { topic_id: 1201, subject_id: 3, grade: 9, name: "Organizarea lumii vii" },
  { topic_id: 1202, subject_id: 3, grade: 9, name: "Celula: structura si functii" },
  { topic_id: 1203, subject_id: 3, grade: 9, name: "Tesuturi, organe si sisteme" },
  { topic_id: 1204, subject_id: 3, grade: 9, name: "Biodiversitate si clasificare" },
];
const adaptiveStartPayloads = new WeakMap<Page, any[]>();

function appUrl(path: string) {
  return new URL(path, BASE_URL).toString();
}

function makeUser(role: Role) {
  const roleName = role.toLowerCase().replace("organization_admin", "admin");
  return {
    id: `${roleName}-e2e-user`,
    firstName: role === "TEACHER" ? "Test" : "Ada",
    lastName: role === "TEACHER" ? "Teacher" : "Student",
    email: `${roleName}@e2e.test`,
    role,
    status: "ACTIVE",
    organizationId: "org-e2e",
    organizationName: "E2E Academy",
    organizationType: "School",
    country: "Romania",
    city: "Bucharest",
    organizationPhoneNumber: "+40700000000",
    organizationAddress: "E2E Street",
  };
}

async function seedSession(page: Page, role: Role = "STUDENT") {
  const user = makeUser(role);

  await page.context().clearCookies();
  await page.context().addCookies([
    { name: "accessToken", value: "e2e-token", url: BASE_URL },
    { name: "role", value: role, url: BASE_URL },
  ]);

  await page.addInitScript(
    ({ seededUser }) => {
      localStorage.setItem("accessToken", "e2e-token");
      localStorage.setItem("user", JSON.stringify(seededUser));
      localStorage.setItem("theme", "light");
      localStorage.setItem("sidebarCollapsed", "true");
    },
    { seededUser: user }
  );
}

async function openChat(page: Page) {
  const button = page.getByRole("button", { name: /customer support chat/i });
  const title = page.getByText(CHAT_TITLE);

  await expect(button).toBeVisible();
  await button.click();

  try {
    await expect(title).toBeVisible({ timeout: 1500 });
  } catch {
    await button.click();
    await expect(title).toBeVisible();
  }
}

function subjectsWithTopics() {
  return catalogSubjects
    .map((subject) => ({
      subject,
      topics: catalogTopics.filter((topic) => topic.subject_id === subject.subject_id),
    }))
    .filter(({ topics }) => topics.length > 0);
}

function getAdaptiveFixture(subjectIndex = 0) {
  const fixtures = subjectsWithTopics();
  const fixture = fixtures[subjectIndex];
  if (!fixture) {
    throw new Error("No adaptive subject with available topics was found in ml-tests.json.");
  }

  return fixture;
}

function getAdaptiveStartPayloads(page: Page) {
  return adaptiveStartPayloads.get(page) ?? [];
}

async function sendChatMessage(page: Page, message: string) {
  await page.getByPlaceholder("Type a message...").fill(message);
  await page.locator('button:has-text("send")').click();
}

async function mockSupportChat(
  page: Page,
  answerFor: (
    requestBody: any
  ) => string | { status: number; error: string } | Promise<string | { status: number; error: string }>
) {
  await page.route("**/api/customer-support", async (route) => {
    const body = route.request().postDataJSON();
    const result = await answerFor(body);

    if (typeof result !== "string") {
      await route.fulfill({
        status: result.status,
        contentType: "application/json",
        body: JSON.stringify({ error: result.error }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ answer: result }),
    });
  });
}

function makeAdaptiveExercises(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const type =
      index % 3 === 1 ? "MULTI_CHOICE" : index % 3 === 2 ? "TRUE_FALSE" : "SINGLE_CHOICE";
    const answers =
      type === "TRUE_FALSE"
        ? ["True", "False"]
        : [`Correct ${index + 1}`, `Wrong ${index + 1}`, `Distractor ${index + 1}`];

    return {
      exerciseId: `ex-${index + 1}`,
      text: `Question about the selected topic ${index + 1}`,
      type,
      answers,
    };
  });
}

async function mockAdaptiveApi(
  page: Page,
  options: {
    onStart?: (payload: any) => void;
  } = {}
) {
  const startPayloads: any[] = [];
  adaptiveStartPayloads.set(page, startPayloads);

  await page.route(/\/api\/v1\/auth\/refresh(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accessToken: "e2e-token-refreshed" }),
    });
  });

  await page.route("**/api/v1/adaptive/start", async (route) => {
    const body = route.request().postDataJSON();
    startPayloads.push(body);
    options.onStart?.(body);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sessionId: "adaptive-session-e2e",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        exercises: makeAdaptiveExercises(body.count),
      }),
    });
  });

  await page.route("**/api/v1/adaptive/sessions/*/submit", async (route) => {
    const body = route.request().postDataJSON();
    const clientResults = body.answers.map((answer: any, index: number) => {
      const exercise = makeAdaptiveExercises(body.answers.length)[index];
      const correctAnswers =
        exercise.type === "MULTI_CHOICE"
          ? [exercise.answers[0], exercise.answers[2]]
          : [exercise.answers[0]];
      const correct =
        correctAnswers.length === answer.givenAnswers.length &&
        correctAnswers.every((item) => answer.givenAnswers.includes(item));

      return {
        mlExerciseId: answer.exerciseId,
        correct,
        score: correct ? 1 : 0,
        correctAnswers,
        givenAnswers: answer.givenAnswers,
      };
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sessionId: "adaptive-session-e2e",
        totalScore: clientResults.filter((item: any) => item.correct).length,
        clientResults,
        feedbackSent: true,
      }),
    });
  });
}

async function chooseAdaptiveTopic(page: Page) {
  await page.waitForLoadState("load");
  await page.getByRole("heading", { name: /adaptive learning/i }).waitFor();
  const subjectSelect = page.locator("select").first();
  await expect(subjectSelect).toBeVisible();
  const { subject, topics } = getAdaptiveFixture();

  await selectNativeOption(subjectSelect, String(subject.subject_id));

  const topicSelect = page.locator("select").nth(1);
  await expect(topicSelect).toBeVisible();
  await expect(topicSelect.locator("option")).toHaveCount(topics.length + 1);
  await selectNativeOption(topicSelect, String(topics[0].topic_id));

  return { subjectId: subject.subject_id, topicId: topics[0].topic_id };
}

async function selectNativeOption(locator: ReturnType<Page["locator"]>, value: string) {
  await locator.selectOption(value);
}

async function startAdaptiveSession(page: Page, count: number) {
  await page.goto(appUrl("/dashboard/student/adaptive"), { waitUntil: "load" });
  const selected = await chooseAdaptiveTopic(page);
  await page.locator('input[type="range"]').fill(String(count));
  await page.getByRole("button", { name: /start session/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/student\/adaptive\/test/);
  return selected;
}

async function answerAdaptiveQuestion(page: Page, questionId: string, answerNames: string[]) {
  const question = page.locator(`#q-${questionId}`);
  for (const answerName of answerNames) {
    await question.getByRole("button", { name: answerName }).click();
  }
}

async function answerAllAdaptiveQuestions(page: Page, count: number, allCorrect = true) {
  const exercises = makeAdaptiveExercises(count);
  for (const exercise of exercises) {
    if (exercise.type === "MULTI_CHOICE") {
      await answerAdaptiveQuestion(
        page,
        exercise.exerciseId,
        allCorrect ? [exercise.answers[0], exercise.answers[2]] : [exercise.answers[1]]
      );
    } else {
      await answerAdaptiveQuestion(
        page,
        exercise.exerciseId,
        [allCorrect ? exercise.answers[0] : exercise.answers[1]]
      );
    }
  }
}

function courseFullView({ video = false } = {}) {
  return {
    id: COURSE_ID,
    title: "AI QA Course",
    description: "Course used for Playwright AI checks",
    category: "Testing",
    status: "PUBLISHED",
    visibility: "PRIVATE",
    createdAt: "2026-05-25T00:00:00Z",
    chapters: [
      {
        id: "chapter-e2e",
        courseId: COURSE_ID,
        title: "AI Chapter",
        orderIndex: 1,
        lessons: [
          {
            id: LESSON_ID,
            chapterId: "chapter-e2e",
            title: video ? "Video-only lesson" : "Text lesson for AI",
            contentMarkdown: video ? "" : "Photosynthesis lesson content.",
            orderIndex: 1,
            testId: null,
            lessonResources: video
              ? [
                  {
                    id: "resource-video",
                    lessonId: LESSON_ID,
                    title: "Lesson video",
                    url: "https://www.youtube.com/watch?v=e2e",
                  },
                ]
              : [],
          },
        ],
      },
    ],
  };
}

const draftTest = {
  id: TEST_ID,
  lessonId: LESSON_ID,
  title: "Lesson test",
  description: "",
  timeLimitSec: 60,
  status: "DRAFT",
  aiEnabled: true,
};

const generatedQuestions = [
  {
    id: 101,
    questionType: "SINGLE_CHOICE",
    content: "What does photosynthesis produce?",
    difficulty: 1,
    options: [
      { optionId: 1001, text: "Oxygen and glucose", displayOrder: 1, isCorrect: true },
      { optionId: 1002, text: "Only carbon dioxide", displayOrder: 2, isCorrect: false },
      { optionId: 1003, text: "Salt", displayOrder: 3, isCorrect: false },
    ],
    correctAnswers: [{ optionId: 1001 }],
  },
  {
    id: 102,
    questionType: "MULTI_CHOICE",
    content: "Which inputs are used in photosynthesis?",
    difficulty: 1,
    options: [
      { optionId: 2001, text: "Light", displayOrder: 1, isCorrect: true },
      { optionId: 2002, text: "Water", displayOrder: 2, isCorrect: true },
      { optionId: 2003, text: "Plastic", displayOrder: 3, isCorrect: false },
    ],
    correctAnswers: [{ optionId: 2001 }, { optionId: 2002 }],
  },
];

async function mockTeacherAiApi(
  page: Page,
  options: {
    generationFails?: boolean;
    videoLesson?: boolean;
    published?: boolean;
    onQuestionSave?: (payload: any) => void;
  } = {}
) {
  await page.route("**/api/v1/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accessToken: "e2e-token-refreshed" }),
    });
  });

  await page.route(/\/api\/v1\/courses\/[^/]+\/full-view(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(courseFullView({ video: options.videoLesson })),
    });
  });

  await page.route(/\/api\/v1\/lessons\/[^/]+\/test(?:\?.*)?$/, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(draftTest),
      });
      return;
    }

    if (options.published) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...draftTest, status: "PUBLISHED" }),
      });
      return;
    }

    await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  });

  await page.route(/\/api\/v1\/lessons\/[^/]+\/ai\/generate-test(?:\?.*)?$/, async (route) => {
    const body = route.request().postDataJSON();
    expect(body.count).toBeGreaterThanOrEqual(1);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        requestId: "ai-request-e2e",
        status: options.generationFails ? "FAILED" : "PENDING",
      }),
    });
  });

  await page.route(/\/api\/v1\/ai\/requests\/[^/]+\/status(?:\?.*)?$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        requestId: "ai-request-e2e",
        status: options.generationFails ? "FAILED" : "DONE",
        error: options.generationFails ? "Model unavailable for this lesson." : undefined,
      }),
    });
  });

  await page.route(/\/api\/v1\/ai\/request\/[^/]+\/inject(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        testId: TEST_ID,
        testCreated: true,
        injectedCount: generatedQuestions.length,
        newTotalQuestions: generatedQuestions.length,
        lessonId: LESSON_ID,
      }),
    });
  });

  await page.route(/\/api\/v1\/tests\/[^/]+(?:\/publish)?(?:\?.*)?$/, async (route) => {
    if (route.request().url().includes("/publish")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...draftTest, status: "PUBLISHED" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(options.published ? { ...draftTest, status: "PUBLISHED" } : draftTest),
    });
  });

  await page.route(/\/api\/tests\/[^/]+\/questions(?:\?.*)?$/, fulfillQuestions);
  await page.route(/\/api\/tests\/[^/]+\/questions\/[^/?]+(?:\?.*)?$/, async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({ status: 204 });
      return;
    }

    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      options.onQuestionSave?.(body);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...generatedQuestions[0],
          content: body.content,
          questionType: body.questionType,
          options: body.options.map((option: any, index: number) => ({
            optionId: 1001 + index,
            text: option.text,
            displayOrder: option.displayOrder,
            isCorrect: option.isCorrect,
          })),
          correctAnswers: body.options
            .map((option: any, index: number) => ({ option, optionId: 1001 + index }))
            .filter(({ option }: any) => option.isCorrect)
            .map(({ optionId }: any) => ({ optionId })),
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(generatedQuestions[0]),
    });
  });
}

async function fulfillQuestions(route: Route) {
  if (route.request().method() === "POST") {
    const body = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 999,
        questionType: body.questionType,
        content: body.content,
        options: body.options.map((option: any, index: number) => ({
          optionId: 9000 + index,
          ...option,
        })),
        correctAnswers: body.options
          .map((option: any, index: number) => ({ option, index }))
          .filter(({ option }: any) => option.isCorrect)
          .map(({ index }: any) => ({ optionId: 9000 + index })),
      }),
    });
    return;
  }

  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(generatedQuestions),
  });
}

async function clickGenerateAi(page: Page) {
  const button = page.getByRole("button", { name: /generate ai/i });
  await expect(button).toBeEnabled();
  await page.waitForTimeout(300);
  await button.click();

  try {
    await expect(page.getByRole("button", { name: /generating/i })).toBeVisible({
      timeout: 1000,
    });
  } catch {
    if (await button.isEnabled().catch(() => false)) {
      await button.click();
    }
  }
}

test.describe("AI features - customer support chatbot", () => {
  test("opens with current AdaptiveTutor branding and a personalized empty state", async ({
    page,
  }) => {
    await seedSession(page, "STUDENT");

    await page.goto(appUrl("/dashboard/student/adaptive"), { waitUntil: "domcontentloaded" });
    await openChat(page);

    await expect(page.getByText(CHAT_TITLE)).toBeVisible();
    await expect(page.getByText("We're here to help")).toBeVisible();
    await expect(page.getByText("Hello, Ada!")).toBeVisible();
    await expect(page.getByText(/Ask us anything about the platform/i)).toBeVisible();
  });

  test("opens, blocks empty messages, sends English and Romanian messages, and keeps in-window history", async ({
    page,
  }) => {
    await seedSession(page, "STUDENT");
    await mockSupportChat(page, (body) => {
      if (body.message.includes("create a course")) {
        return "Teachers can create a course from My Courses, then add chapters and lessons.";
      }
      if (body.message.includes("Cum")) {
        return "Poti crea un curs din zona profesorului, apoi adaugi lectii.";
      }
      return "Support answer.";
    });

    await page.goto(appUrl("/dashboard/student/adaptive"), { waitUntil: "domcontentloaded" });
    await openChat(page);

    await page.getByPlaceholder("Type a message...").fill("   ");
    await expect(page.locator('button:has-text("send")')).toBeDisabled();

    await sendChatMessage(page, "How do I create a course?");
    await expect(page.getByText(/Teachers can create a course/i)).toBeVisible();

    await sendChatMessage(page, "Cum creez un curs?");
    await expect(page.getByText(/Poti crea un curs/i)).toBeVisible();

    await page.getByRole("button", { name: /customer support chat/i }).click();
    await expect(page.getByText(CHAT_TITLE)).toBeHidden();
    await page.getByRole("button", { name: /customer support chat/i }).click();
    await expect(page.getByText("How do I create a course?")).toBeVisible();
    await expect(page.getByText("Cum creez un curs?")).toBeVisible();
  });

  test("handles long messages, consecutive sends, loading lock, and service errors", async ({ page }) => {
    await seedSession(page, "STUDENT");
    let requestCount = 0;
    await mockSupportChat(page, async (body) => {
      requestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (body.message.includes("service fail")) {
        return { status: 503, error: "Customer support service is temporarily unavailable." };
      }
      return `Answer ${requestCount}: ${body.message.slice(0, 20)}`;
    });

    await page.goto(appUrl("/dashboard/student/adaptive"), { waitUntil: "domcontentloaded" });
    await openChat(page);

    await page.getByPlaceholder("Type a message...").fill("a".repeat(550));
    await page.locator('button:has-text("send")').click();
    await expect(page.getByPlaceholder("Type a message...")).toBeDisabled();
    await expect(page.locator('button:has-text("send")')).toBeDisabled();
    await expect(page.getByText(/Answer 1:/)).toBeVisible();

    await sendChatMessage(page, "first follow-up");
    await expect(page.getByText(/Answer 2:/)).toBeVisible();
    await sendChatMessage(page, "second follow-up");
    await expect(page.getByText(/Answer 3:/)).toBeVisible();

    await sendChatMessage(page, "service fail");
    await expect(page.getByText(/temporarily unavailable/i)).toBeVisible();
    await expect(page.getByText("service fail")).toHaveCount(0);
  });

  test("displays English and Romanian support answers without changing their language", async ({
    page,
  }) => {
    await seedSession(page, "STUDENT");
    const receivedMessages: string[] = [];

    await mockSupportChat(page, (body) => {
      receivedMessages.push(body.message);
      if (body.message === "How do I create a course?") {
        return "Create a course from the teacher dashboard.";
      }
      if (body.message === "Cum creez un curs?") {
        return "Creezi un curs din panoul profesorului.";
      }
      return "Support answer.";
    });

    await page.goto(appUrl("/dashboard/student/adaptive"), { waitUntil: "domcontentloaded" });
    await openChat(page);

    await sendChatMessage(page, "How do I create a course?");
    await expect(page.getByText("Create a course from the teacher dashboard.")).toBeVisible();

    await sendChatMessage(page, "Cum creez un curs?");
    await expect(page.getByText("Creezi un curs din panoul profesorului.")).toBeVisible();

    expect(receivedMessages).toEqual(["How do I create a course?", "Cum creez un curs?"]);
  });

  test("redirects unauthenticated users before the dashboard chatbot is available", async ({
    page,
  }) => {
    await page.goto(appUrl("/dashboard/student/adaptive"), { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("button", { name: /customer support chat/i })).toHaveCount(0);
  });

  test("resets chatbot history after page refresh", async ({ page }) => {
    await seedSession(page, "STUDENT");
    await mockSupportChat(page, () => "Stored only in Redux.");

    await page.goto(appUrl("/dashboard/student/adaptive"), { waitUntil: "domcontentloaded" });
    await openChat(page);
    await sendChatMessage(page, "Will this survive refresh?");
    await expect(page.getByText("Stored only in Redux.")).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await openChat(page);
    await expect(page.getByText("Will this survive refresh?")).toHaveCount(0);
    await expect(page.getByText(/Ask us anything about the platform/i)).toBeVisible();
  });

  test("chat button does not overlap the adaptive start button on desktop", async ({ page }) => {
    await seedSession(page, "STUDENT");
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(appUrl("/dashboard/student/adaptive"), { waitUntil: "domcontentloaded" });

    const chatBox = await page.getByRole("button", { name: /customer support chat/i }).boundingBox();
    const startBox = await page.getByRole("button", { name: /start session/i }).boundingBox();

    expect(chatBox).not.toBeNull();
    expect(startBox).not.toBeNull();
    const overlap =
      chatBox!.x < startBox!.x + startBox!.width &&
      chatBox!.x + chatBox!.width > startBox!.x &&
      chatBox!.y < startBox!.y + startBox!.height &&
      chatBox!.y + chatBox!.height > startBox!.y;

    expect(overlap).toBe(false);
  });
});

test.describe("AI features - adaptive tests", () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, "STUDENT");
    await mockAdaptiveApi(page);
  });

  test("shows topics after selecting available subjects", async ({ page }) => {
    await page.goto(appUrl("/dashboard/student/adaptive"), { waitUntil: "load" });

    const subjectSelect = page.locator("select").first();
    await expect(subjectSelect).toBeVisible();
    await expect(page.getByRole("button", { name: /start session/i })).toBeDisabled();

    const fixtures = subjectsWithTopics().slice(0, 3);
    expect(fixtures.length).toBeGreaterThan(0);

    for (const { subject, topics } of fixtures) {
      await selectNativeOption(subjectSelect, String(subject.subject_id));
      const topicSelect = page.locator("select").nth(1);
      await expect(topicSelect).toBeVisible();
      await expect(topicSelect.locator("option")).toHaveCount(topics.length + 1);

      const optionValues = await topicSelect.evaluate((select) =>
        Array.from((select as HTMLSelectElement).options)
          .filter((option) => option.value)
          .map((option) => option.value)
      );

      expect(optionValues).toEqual(topics.map((topic) => String(topic.topic_id)));
    }
  });

  test("starts sessions with exactly 3 and 15 questions", async ({ page }) => {
    const firstSelection = await startAdaptiveSession(page, 3);
    await expect(page.locator('[id^="q-ex-"]')).toHaveCount(3);
    expect(getAdaptiveStartPayloads(page)[0]).toEqual({
      subjectId: firstSelection.subjectId,
      topicId: firstSelection.topicId,
      count: 3,
    });

    await page.goto(appUrl("/dashboard/student/adaptive"), { waitUntil: "domcontentloaded" });
    const secondSelection = await startAdaptiveSession(page, 15);
    await expect(page.locator('[id^="q-ex-"]')).toHaveCount(15);
    expect(getAdaptiveStartPayloads(page)[1]).toEqual({
      subjectId: secondSelection.subjectId,
      topicId: secondSelection.topicId,
      count: 15,
    });
  });

  test("uses circular indicators for single choice and square indicators for multi choice", async ({ page }) => {
    await startAdaptiveSession(page, 3);

    const singleIndicatorClass = await page
      .locator("#q-ex-1 button")
      .first()
      .locator("span")
      .first()
      .getAttribute("class");
    const multiIndicatorClass = await page
      .locator("#q-ex-2 button")
      .first()
      .locator("span")
      .first()
      .getAttribute("class");

    expect(singleIndicatorClass).toContain("rounded-full");
    expect(multiIndicatorClass).toContain("rounded-sm");
  });

  test("keeps submit disabled until every question is answered, then scores and reviews correctly", async ({
    page,
  }) => {
    await startAdaptiveSession(page, 3);

    await answerAdaptiveQuestion(page, "ex-1", ["Correct 1"]);
    await expect(page.getByRole("button", { name: /1 \/ 3 answered/i })).toBeDisabled();

    await answerAllAdaptiveQuestions(page, 3, true);
    await expect(page.getByRole("button", { name: /^submit answers$/i }).first()).toBeEnabled();

    await page.getByRole("button", { name: /^submit answers$/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/student\/adaptive\/results/);
    await expect(page.getByText("100%")).toBeVisible();
    await expect(page.getByText("3 out of 3 questions correct")).toBeVisible();
    await expect(page.getByText("AI feedback sent")).toBeVisible();
    await expect(page.locator('[class*="border-green-500/50"]')).toHaveCount(3);
  });

  test("shows red review styling for wrong answers and returns to picker with Try another test", async ({
    page,
  }) => {
    await startAdaptiveSession(page, 3);
    await answerAllAdaptiveQuestions(page, 3, false);
    await page.getByRole("button", { name: /^submit answers$/i }).first().click();

    await expect(page.getByText("0%")).toBeVisible();
    await expect(page.locator('[class*="border-red-400/50"]')).toHaveCount(3);

    await page.getByRole("button", { name: /try another test/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/student\/adaptive$/);
    await expect(page.getByRole("button", { name: /start session/i })).toBeVisible();
  });

  test("requires multi-choice answers to stay selected and can become unanswered again", async ({ page }) => {
    await startAdaptiveSession(page, 3);

    await answerAdaptiveQuestion(page, "ex-2", ["Correct 2"]);
    await expect(page.getByText(/1\/3 done/i)).toBeVisible();

    await answerAdaptiveQuestion(page, "ex-2", ["Correct 2"]);
    await expect(page.getByText(/0\/3 done/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /0 \/ 3 answered/i })).toBeDisabled();
  });

  test("redirects to picker after refreshing an in-progress adaptive test", async ({ page }) => {
    await startAdaptiveSession(page, 3);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard\/student\/adaptive$/);
  });

  test("does not render mojibake in Romanian subject/topic labels", async ({ page }) => {
    await page.goto(appUrl("/dashboard/student/adaptive"), { waitUntil: "domcontentloaded" });
    const bodyText = await page.locator("body").innerText();

    expect(bodyText).not.toMatch(MOJIBAKE_PATTERN);
  });

  test("documents that Romanian catalog labels should not contain mojibake in selectors", async ({
    page,
  }) => {
    await page.goto(appUrl("/dashboard/student/adaptive"), { waitUntil: "domcontentloaded" });
    await chooseAdaptiveTopic(page);

    const labels = await page.locator("select option").evaluateAll((options) =>
      options.map((option) => option.textContent ?? "").join("\n")
    );

    expect(labels).not.toMatch(MOJIBAKE_PATTERN);
  });
});

test.describe("AI features - teacher AI test generation", () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, "TEACHER");
  });

  test("generates AI questions, shows loading, renders generated questions, and allows edits", async ({
    page,
  }) => {
    await mockTeacherAiApi(page);
    await page.goto(
      appUrl(`/dashboard/teacher/courses/${COURSE_ID}/lessons/${LESSON_ID}/test-builder`),
      { waitUntil: "domcontentloaded" }
    );

    await expect(page.getByLabel("Lesson")).toHaveValue("Text lesson for AI");
    await page.getByRole("textbox", { name: "AI question count" }).fill("3");
    await clickGenerateAi(page);
    await expect(page.getByRole("button", { name: /generating/i })).toBeVisible();

    await expect(page.getByText("2 AI questions added.")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("What does photosynthesis produce?")).toBeVisible();
    await expect(page.getByText("Which inputs are used in photosynthesis?")).toBeVisible();

    await page.getByPlaceholder("Write the question prompt here...").first().fill("Edited AI prompt");
    await expect(page.getByPlaceholder("Write the question prompt here...").first()).toHaveValue(
      "Edited AI prompt"
    );

    await page.getByRole("button", { name: /add option/i }).first().click();
    await expect(page.locator("#q-question-101 input").last()).toHaveValue("Option 4");
  });

  test("saves an edited generated question after AI generation", async ({ page }) => {
    let savedQuestionPayload: any = null;

    await mockTeacherAiApi(page, {
      onQuestionSave: (payload) => {
        savedQuestionPayload = payload;
      },
    });

    await page.goto(
      appUrl(`/dashboard/teacher/courses/${COURSE_ID}/lessons/${LESSON_ID}/test-builder`),
      { waitUntil: "domcontentloaded" }
    );

    await clickGenerateAi(page);
    await expect(page.getByText("2 AI questions added.")).toBeVisible({ timeout: 10000 });

    await page
      .getByPlaceholder("Write the question prompt here...")
      .first()
      .fill("Edited saved AI prompt");
    await page.getByRole("button", { name: /^save$/i }).first().click();

    await expect
      .poll(() => savedQuestionPayload?.content)
      .toBe("Edited saved AI prompt");
    expect(savedQuestionPayload.questionType).toBe("SINGLE_CHOICE");
    expect(savedQuestionPayload.options.length).toBeGreaterThanOrEqual(3);
    expect(savedQuestionPayload.options.some((option: any) => option.isCorrect)).toBe(true);
  });

  test("shows clear error when AI generation fails", async ({ page }) => {
    await mockTeacherAiApi(page, { generationFails: true });
    await page.goto(
      appUrl(`/dashboard/teacher/courses/${COURSE_ID}/lessons/${LESSON_ID}/test-builder`),
      { waitUntil: "domcontentloaded" }
    );

    await clickGenerateAi(page);
    await expect(page.getByText(/AI generation failed|Model unavailable/i)).toBeVisible();
  });

  test("blocks AI generation for video-only lessons", async ({ page }) => {
    await mockTeacherAiApi(page, { videoLesson: true });
    await page.goto(
      appUrl(`/dashboard/teacher/courses/${COURSE_ID}/lessons/${LESSON_ID}/test-builder`),
      { waitUntil: "domcontentloaded" }
    );

    await expect(page.getByText(/Tests cannot be generated from video content/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /generate ai/i })).toBeDisabled();
  });

  test("can add a valid manual question, delete questions, and publish after generation", async ({ page }) => {
    await mockTeacherAiApi(page);
    await page.goto(
      appUrl(`/dashboard/teacher/courses/${COURSE_ID}/lessons/${LESSON_ID}/test-builder`),
      { waitUntil: "domcontentloaded" }
    );

    await clickGenerateAi(page);
    await expect(page.getByText("2 AI questions added.")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /add question/i }).click();
    await expect(page.getByPlaceholder("Write the question prompt here...")).toHaveCount(3);

    const manualQuestion = page.locator('[id^="q-question-"]').last();
    await manualQuestion
      .getByPlaceholder("Write the question prompt here...")
      .fill("What is the manually added review question?");
    const manualOptions = manualQuestion.getByPlaceholder("Answer choice...");
    await manualOptions.nth(0).fill("Manual correct answer");
    await manualOptions.nth(1).fill("Manual wrong answer A");
    await manualOptions.nth(2).fill("Manual wrong answer B");
    await manualOptions.nth(3).fill("Manual wrong answer C");

    await page.getByRole("button", { name: /delete/i }).first().click();
    await expect(page.getByPlaceholder("Write the question prompt here...")).toHaveCount(2);

    await page.getByRole("button", { name: /publish/i }).click();
    await expect(page.getByText(/Read-only published test/i)).toBeVisible();
    await expect(page.getByText(/Published tests are read-only/i)).toBeVisible();
  });

  test("renders published tests as read-only", async ({ page }) => {
    await mockTeacherAiApi(page, { published: true });
    await page.goto(
      appUrl(`/dashboard/teacher/courses/${COURSE_ID}/lessons/${LESSON_ID}/test-builder`),
      { waitUntil: "domcontentloaded" }
    );

    await expect(page.getByText(/Read-only published test/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /generate ai/i })).toBeDisabled();
    await expect(page.getByRole("button", { name: /add question/i })).toHaveCount(0);
    await expect(page.getByPlaceholder("Write the question prompt here...").first()).toBeDisabled();
  });

});
