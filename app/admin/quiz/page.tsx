import { Suspense } from "react";
import QuizClient from "./QuizBuilder";

export default function QuizPage() {
  return (
    <Suspense fallback={<div>Loading quiz builder...</div>}>
      <QuizClient />
    </Suspense>
  );
}
