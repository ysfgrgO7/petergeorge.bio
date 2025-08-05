import { Suspense } from "react";
import QuizClient from "./QuizClient";

export default function QuizPageWrapper() {
  return (
    <Suspense fallback={<div>Loading quiz...</div>}>
      <QuizClient />
    </Suspense>
  );
}
