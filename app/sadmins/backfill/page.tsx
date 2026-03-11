"use client";

import { useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function BackfillPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const log = (msg: string) => setLogs((prev) => [...prev, msg]);

  const runBackfill = async () => {
    setLoading(true);
    setLogs([]);
    setDone(false);
    
    try {
      log("Starting backfill process...");
      const studentsRef = collection(db, "students");
      const studentsSnap = await getDocs(studentsRef);
      log(`Found ${studentsSnap.docs.length} students. Checking progress...`);

      let totalUpdated = 0;

      for (const studentDoc of studentsSnap.docs) {
        const studentId = studentDoc.id;
        const progressRef = collection(db, "students", studentId, "progress");
        const progressSnap = await getDocs(progressRef);

        for (const progDoc of progressSnap.docs) {
          const data = progDoc.data();
          const docId = progDoc.id; // Format is usually: year_courseId_lectureId

          const parts = docId.split("_");
          if (parts.length >= 3) {
            const lectureId = parts.pop();
            const courseId = parts.pop();
            const yearStr = parts.join("_"); // Just in case year has an underscore

            let needsUpdate = false;
            let updatePayload: any = {};

            if (data.lectureId !== lectureId) {
              needsUpdate = true;
              updatePayload.lectureId = lectureId;
            }
            if (data.courseId !== courseId) {
              needsUpdate = true;
              updatePayload.courseId = courseId;
            }
            if (data.year !== yearStr) {
              needsUpdate = true;
              updatePayload.year = yearStr;
            }

            if (needsUpdate) {
              await updateDoc(doc(db, "students", studentId, "progress", docId), updatePayload);
              totalUpdated++;
            }
          }
        }
      }

      log(`✅ Backfill complete. Updated ${totalUpdated} progress documents successfully.`);
      setDone(true);
    } catch (err: any) {
      log(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Backfill Student Progress Documents</h1>
      <p>This script fixes the database by adding year, courseId, and lectureId to existing progress documents so they can be queried quickly.</p>
      
      <button 
        onClick={runBackfill} 
        disabled={loading || done}
        style={{ padding: "10px 20px", fontSize: "16px", cursor: loading ? "wait" : "pointer" }}
      >
        {loading ? "Running Backfill..." : done ? "Done!" : "Run Backfill Now"}
      </button>

      <div style={{ marginTop: "2rem", background: "#f4f4f4", padding: "1rem", borderRadius: "8px", maxHeight: "400px", overflowY: "auto", color: "#333", fontFamily: "monospace" }}>
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
