import { Suspense } from "react";
import QuizResults from "./resultsComponent";

export default function QuizPageWrapper() {
  return (
    <Suspense fallback={<div>Loading quiz...</div>}>
      <QuizResults />
    </Suspense>
  );
}
