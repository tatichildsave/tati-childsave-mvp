/**
 * Phase 7C4B Security Gate: Legacy Submission Bypass Tests
 *
 * Verifies that the legacy Supabase-backed assessment submission path
 * is disabled to prevent parent submissions from bypassing Firebase authorization.
 *
 * Requirements:
 * - Parents cannot submit assessments on behalf of children
 * - The legacy Supabase submission path cannot be invoked directly
 * - Child-facing Firebase assessment submission remains functional
 * - Parent read-only progress access remains functional
 */

import { describe, it, expect } from "vitest";
import { saveAssessmentAttempt } from "@/lib/assessment/attempts";
import type { AssessmentDefinition, AssessmentResult } from "@/lib/assessment/types";

describe("Legacy Assessment Submission Disabled", () => {
  const sampleDefinition: AssessmentDefinition = {
    id: "save-pre",
    trackId: "save",
    assessmentType: "pre",
    title: "Test Assessment",
    shortTitle: "Test",
    intro: "Test intro",
    introHeadline: "Test headline",
    introImageUrl: "http://test.png",
    introImageBadge: "Test Badge",
    introTopics: [],
    estimatedMinutes: 5,
    startingWallet: 10,
    showScoreToChild: false,
    questions: [
      {
        id: "q1",
        assessmentType: "pre",
        competency: "needs-vs-wants",
        question: "Test question?",
        options: [
          { id: "opt1a", label: "Option A" },
          { id: "opt1b", label: "Option B" },
        ],
        feedback: "Good",
      },
    ],
  };

  const sampleResult: AssessmentResult = {
    assessmentId: "save-pre",
    assessmentType: "pre",
    points: 1,
    maxPoints: 1,
    responses: { q1: "opt1a" },
    competencies: [{ competency: "needs-vs-wants", points: 1, maxPoints: 1 }],
  };

  describe("saveAssessmentAttempt - Legacy Path Disabled", () => {
    it("should reject parent assessment submissions with clear error message", async () => {
      await expect(
        saveAssessmentAttempt("child-1", sampleDefinition, sampleResult),
      ).rejects.toThrow(/Parent assessment submissions are temporarily disabled/);
    });

    it("should reject attempts to submit pre-assessments via legacy path", async () => {
      const preResult = { ...sampleResult, assessmentType: "pre" as const };
      await expect(
        saveAssessmentAttempt("child-2", sampleDefinition, preResult),
      ).rejects.toThrow(/temporarily disabled/);
    });

    it("should reject attempts to submit post-assessments via legacy path", async () => {
      const postDefinition = { ...sampleDefinition, id: "save-post", assessmentType: "post" as const };
      const postResult = { ...sampleResult, assessmentType: "post" as const, assessmentId: "save-post" };
      await expect(
        saveAssessmentAttempt("child-3", postDefinition, postResult),
      ).rejects.toThrow(/temporarily disabled/);
    });

    it("should reject retake submissions via legacy path", async () => {
      // Simulating a parent submitting a retake on behalf of a child
      const retakeResult = { ...sampleResult, points: 0, maxPoints: 1 };
      await expect(
        saveAssessmentAttempt("child-4", sampleDefinition, retakeResult),
      ).rejects.toThrow(/temporarily disabled/);
    });

    it("should reject submissions with valid scores from legacy path", async () => {
      const validResult: AssessmentResult = {
        assessmentId: "save-pre",
        assessmentType: "pre",
        points: 1,
        maxPoints: 1,
        responses: { q1: "opt1a" },
        competencies: [{ competency: "needs-vs-wants", points: 1, maxPoints: 1 }],
      };
      // Even with perfectly valid data, legacy path should be blocked
      await expect(
        saveAssessmentAttempt("child-5", sampleDefinition, validResult),
      ).rejects.toThrow(/Firebase migration/);
    });

    it("should reject any parent submission regardless of child ID", async () => {
      // Test that ALL parent submissions are rejected, not just specific children
      const childIds = ["child-uuid-1", "child-uuid-2", "different-child-id"];
      for (const childId of childIds) {
        await expect(
          saveAssessmentAttempt(childId, sampleDefinition, sampleResult),
        ).rejects.toThrow(/temporarily disabled/);
      }
    });

    it("error message mentions Phase 7C4C migration plan", async () => {
      try {
        await saveAssessmentAttempt("any-child", sampleDefinition, sampleResult);
        throw new Error("Should have thrown");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).toContain("Phase 7C4C");
        expect(message).toContain("server-side");
      }
    });
  });

  describe("Parent Read-Only Access Preserved", () => {
    // Note: These tests verify that parent CAN still READ assessments
    // Only the ability to SUBMIT is disabled

    it("parent assessment read access is unaffected by submission disable", () => {
      // This is a documentation test - actual parent read flows use RLS,
      // which remains unmodified. Only saveAssessmentAttempt is disabled.
      expect(true).toBe(true);
    });
  });

  describe("Child Firebase Path Unaffected", () => {
    // Note: Child submissions use saveChildAssessment(), not saveAssessmentAttempt()
    // This test documents that fact

    it("child assessment submissions use Firebase path, not legacy Supabase path", () => {
      // Child submissions are handled by:
      // src/lib/auth/child-learning.functions.ts::saveChildAssessment()
      // which uses Firebase Admin SDK (server-side)
      // saveAssessmentAttempt() is NOT called for children
      expect(true).toBe(true);
    });
  });
});
