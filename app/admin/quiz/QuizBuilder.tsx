"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import QuestionBuilder from "../components/QuestionBuilder";
import Loading from "@/app/components/Loading";

function QuizBuilderInner() {
  const searchParams = useSearchParams();
  const year = searchParams.get("year") || "";
  const courseId = searchParams.get("courseId") || "";
  const lectureId = searchParams.get("lectureId") || "";

  return (
    <QuestionBuilder
      builderType="quiz"
      year={year}
      courseId={courseId}
      lectureId={lectureId}
    />
  );
}

export default function QuizBuilder() {
  return (
    <Suspense fallback={<Loading text="Loading..." />}>
      <QuizBuilderInner />
    </Suspense>
  );
}
