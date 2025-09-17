"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  DocumentData,
} from "firebase/firestore";
import styles from "../admin.module.css";
import MessageModal from "@/app/MessageModal";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";

import { IoChevronBackCircleSharp } from "react-icons/io5";

interface LinkItem extends DocumentData {
  id: string;
  text: string;
  url: string;
}

interface HomeworkVideo {
  id: string;
  odyseeName: string;
  odyseeId: string;
}

interface ExtraVideo {
  id: string;
  odyseeName: string;
  odyseeId: string;
}

export default function LectureManagerPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const year = searchParams.get("year");
  const courseId = searchParams.get("courseId");
  const lectureId = searchParams.get("lectureId");
  const lectureTitle = searchParams.get("lectureTitle");

  // State for Odysee link and quizzes
  const [odyseeName, setOdyseeName] = useState("");
  const [odyseeId, setOdyseeId] = useState("");
  const [newOdyseeLink, setNewOdyseeLink] = useState("");

  // New state for homework video
  const [newHomeworkLink, setNewHomeworkLink] = useState("");
  const [homeworkVideos, setHomeworkVideos] = useState<HomeworkVideo[]>([]);

  // New state for extra videos
  const [newExtraVideoLink, setNewExtraVideoLink] = useState("");
  const [extraVideos, setExtraVideos] = useState<ExtraVideo[]>([]);

  // State for Links
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [isHidden, setIsHidden] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const lectureRef =
    year && courseId && lectureId
      ? doc(db, `years/${year}/courses/${courseId}/lectures/${lectureId}`)
      : null;

  const fetchData = async () => {
    if (!lectureRef) return;
    try {
      // Fetch lecture details (including current odysee info)
      const lectureDoc = await getDoc(lectureRef);
      if (lectureDoc.exists()) {
        const data = lectureDoc.data();
        setIsHidden(data.isHidden || false);
        setOdyseeName(data.odyseeName || "");
        setOdyseeId(data.odyseeId || "");
      }

      // Fetch links
      const linksRef = collection(lectureRef, "links");
      const linksSnapshot = await getDocs(linksRef);
      const fetchedLinks: LinkItem[] = linksSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as LinkItem)
      );
      setLinks(fetchedLinks);

      // Fetch homework videos
      const homeworkVideosRef = collection(lectureRef, "homeworkVideos");
      const homeworkVideosSnapshot = await getDocs(homeworkVideosRef);
      const fetchedHomeworkVideos: HomeworkVideo[] =
        homeworkVideosSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as HomeworkVideo)
        );
      setHomeworkVideos(fetchedHomeworkVideos);

      // Fetch extra videos
      const extraVideosRef = collection(lectureRef, "extraVideos");
      const extraVideosSnapshot = await getDocs(extraVideosRef);
      const fetchedExtraVideos: ExtraVideo[] = extraVideosSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as ExtraVideo)
      );
      setExtraVideos(fetchedExtraVideos);

      // Fetch quiz count
    } catch (error) {
      let message = "Failed to fetch lecture data.";
      if (error instanceof Error) {
        message = error.message;
      }
      setModalMessage(message);
      setShowModal(true);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.email) {
          const adminDocRef = doc(db, "admins", user.email);
          const adminDocSnap = await getDoc(adminDocRef);

          if (adminDocSnap.exists()) {
            setIsAdmin(true);
          } else {
            router.push("/");
          }
        } else {
          router.push("/");
        }
      } else {
        router.push("/");
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup the listener on component unmount
  }, [router]);

  useEffect(() => {
    if (lectureRef) {
      fetchData();
    }
  }, [lectureRef]);

  const extractOdyseeInfo = (
    url: string
  ): { name: string; id: string } | null => {
    const regex = /odysee\.com\/[^/]+\/([^:]+):([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    if (!match) return null;
    return { name: match[1], id: match[2] };
  };

  const handleUpdateOdyseeLink = async () => {
    if (!newOdyseeLink.trim()) {
      setModalMessage("Odysee link cannot be empty.");
      setShowModal(true);
      return;
    }

    const info = extractOdyseeInfo(newOdyseeLink);
    if (!info) {
      setModalMessage(
        "Invalid Odysee link format. Please use a link like 'https://odysee.com/@channel/video-name:id'."
      );
      setShowModal(true);
      return;
    }

    if (!lectureRef) return;

    try {
      await updateDoc(lectureRef, {
        odyseeName: info.name,
        odyseeId: info.id,
      });
      setNewOdyseeLink("");
      fetchData();
      setModalMessage("Odysee link updated successfully!");
      setShowModal(true);
    } catch (error: unknown) {
      let message = "Failed to update Odysee link.";
      if (error instanceof Error) {
        message += ": " + error.message;
      }
      setModalMessage(message);
      setShowModal(true);
    }
  };

  const handleAddHomeworkVideo = async () => {
    if (!newHomeworkLink.trim()) {
      setModalMessage("Homework video link cannot be empty.");
      setShowModal(true);
      return;
    }

    const info = extractOdyseeInfo(newHomeworkLink);
    if (!info) {
      setModalMessage(
        "Invalid Odysee link format. Please use a link like 'https://odysee.com/@channel/video-name:id'."
      );
      setShowModal(true);
      return;
    }

    if (!lectureRef) return;

    try {
      const homeworkVideosRef = collection(lectureRef, "homeworkVideos");
      await addDoc(homeworkVideosRef, {
        odyseeName: info.name,
        odyseeId: info.id,
      });
      setNewHomeworkLink("");
      fetchData();
      setModalMessage("Homework video added successfully!");
      setShowModal(true);
    } catch (error: unknown) {
      let message = "Failed to add homework video.";
      if (error instanceof Error) {
        message += ": " + error.message;
      }
      setModalMessage(message);
      setShowModal(true);
    }
  };

  const handleDeleteHomeworkVideo = async (videoId: string) => {
    if (
      !lectureRef ||
      !confirm("Are you sure you want to delete this homework video?")
    )
      return;
    try {
      await deleteDoc(doc(lectureRef, "homeworkVideos", videoId));
      fetchData();
      setModalMessage("Homework video deleted successfully!");
      setShowModal(true);
    } catch (error: unknown) {
      let message = "Failed to delete homework video.";
      if (error instanceof Error) {
        message += ": " + error.message;
      }
      setModalMessage(message);
      setShowModal(true);
    }
  };

  const handleAddExtraVideo = async () => {
    if (!newExtraVideoLink.trim()) {
      setModalMessage("Extra video link cannot be empty.");
      setShowModal(true);
      return;
    }

    const info = extractOdyseeInfo(newExtraVideoLink);
    if (!info) {
      setModalMessage(
        "Invalid Odysee link format. Please use a link like 'https://odysee.com/@channel/video-name:id'."
      );
      setShowModal(true);
      return;
    }

    if (!lectureRef) return;

    try {
      const extraVideosRef = collection(lectureRef, "extraVideos");
      await addDoc(extraVideosRef, {
        odyseeName: info.name,
        odyseeId: info.id,
      });
      setNewExtraVideoLink("");
      fetchData();
      setModalMessage("Extra video added successfully!");
      setShowModal(true);
    } catch (error: unknown) {
      let message = "Failed to add extra video.";
      if (error instanceof Error) {
        message += ": " + error.message;
      }
      setModalMessage(message);
      setShowModal(true);
    }
  };

  const handleDeleteExtraVideo = async (videoId: string) => {
    if (
      !lectureRef ||
      !confirm("Are you sure you want to delete this extra video?")
    )
      return;
    try {
      await deleteDoc(doc(lectureRef, "extraVideos", videoId));
      fetchData();
      setModalMessage("Extra video deleted successfully!");
      setShowModal(true);
    } catch (error: unknown) {
      let message = "Failed to delete extra video.";
      if (error instanceof Error) {
        message += ": " + error.message;
      }
      setModalMessage(message);
      setShowModal(true);
    }
  };

  const handleAddLink = async () => {
    if (!linkText.trim() || !linkUrl.trim()) {
      setModalMessage("Link text and URL cannot be empty.");
      setShowModal(true);
      return;
    }
    if (!lectureRef) return;
    try {
      await addDoc(collection(lectureRef, "links"), {
        text: linkText,
        url: linkUrl,
      });
      setLinkText("");
      setLinkUrl("");
      fetchData();
      setModalMessage("Link added successfully!");
      setShowModal(true);
    } catch (error: unknown) {
      let message = "Failed to add link.";
      if (error instanceof Error) {
        message += ": " + error.message;
      }
      setModalMessage(message);
      setShowModal(true);
    }
  };

  const handleDeleteLecture = async () => {
    if (
      !lectureRef ||
      !confirm(
        `Are you sure you want to delete the lecture "${lectureTitle}"? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await deleteDoc(lectureRef);
      setModalMessage("Lecture deleted successfully!");
      setShowModal(true);
      setTimeout(() => {
        router.push("/admin");
      }, 2000);
    } catch (error: unknown) {
      let message = "Failed to delete lecture.";
      if (error instanceof Error) {
        message += ": " + error.message;
      }
      setModalMessage(message);
      setShowModal(true);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!lectureRef || !confirm("Are you sure you want to delete this link?"))
      return;
    try {
      await deleteDoc(doc(lectureRef, "links", linkId));
      fetchData();
      setModalMessage("Link deleted successfully!");
      setShowModal(true);
    } catch (error: unknown) {
      let message = "Failed to delete link.";
      if (error instanceof Error) {
        message += ": " + error.message;
      }
      setModalMessage(message);
      setShowModal(true);
    }
  };

  const handleManageQuizzes = () => {
    router.push(
      `/admin/quiz?year=${year}&courseId=${courseId}&lectureId=${lectureId}`
    );
  };

  const handleManageHw = () => {
    router.push(
      `/admin/hw?year=${year}&courseId=${courseId}&lectureId=${lectureId}`
    );
  };

  if (!lectureId || !courseId || !year) {
    return (
      <div className={styles.wrapper}>
        <p>Error: Lecture, course, or year information is missing.</p>
        <button onClick={() => router.push("/admin")}>
          Go to Admin Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <button onClick={() => router.push("/admin")}>
        {" "}
        <IoChevronBackCircleSharp /> Back to Dashboard
      </button>
      <h1>Managing: {lectureTitle}</h1>
      <hr />

      <section className={styles.lectureActions}>
        <h2>Lecture Actions</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={handleManageQuizzes}
            className={styles.fullWidthButton}
          >
            Manage Lecture Quiz
          </button>
          <button
            onClick={handleManageHw}
            className={styles.fullWidthButton}
          >
            Manage Lecture H.W.
          </button>
          <button onClick={handleDeleteLecture} className={styles.deleteButton}>
            Delete Lecture
          </button>
        </div>
      </section>

      <hr />

      <section>
        <h2>Main Lecture Odysee Link</h2>
        <p>
          Current Odysee Link:{" "}
          <a
            href={
              odyseeName && odyseeId
                ? `https://odysee.com/$/embed/@${odyseeName}:${odyseeId}`
                : "#"
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            {odyseeName && odyseeId
              ? `https://odysee.com/@${odyseeName}/${odyseeId}`
              : "No Odysee link set"}
          </a>
        </p>
        <div className={styles.form}>
          <input
            type="text"
            placeholder="New Odysee link"
            value={newOdyseeLink}
            onChange={(e) => setNewOdyseeLink(e.target.value)}
          />
          <button onClick={handleUpdateOdyseeLink}>Update Link</button>
        </div>
      </section>

      <hr />

      {/* NEW SECTION FOR ADDITIONAL VIDEOS */}
      <section>
        <h2>Additional Videos</h2>
        <div className={styles.form}>
          <input
            type="text"
            placeholder="New additional video Odysee link"
            value={newExtraVideoLink}
            onChange={(e) => setNewExtraVideoLink(e.target.value)}
          />
          <button onClick={handleAddExtraVideo}>Add Additional Video</button>
        </div>
        <h3>Existing Additional Videos</h3>
        <ul className={styles.subList}>
          {extraVideos.length > 0 ? (
            extraVideos.map((video) => (
              <li key={video.id}>
                <a
                  href={`https://odysee.com/$/embed/@${video.odyseeName}:${video.odyseeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {video.odyseeName}
                </a>
                <button onClick={() => handleDeleteExtraVideo(video.id)}>
                  Delete
                </button>
              </li>
            ))
          ) : (
            <li>No additional videos found.</li>
          )}
        </ul>
      </section>

      <hr />

      <section>
        <h2>Homework Videos</h2>
        <div className={styles.form}>
          <input
            type="text"
            placeholder="New homework video Odysee link"
            value={newHomeworkLink}
            onChange={(e) => setNewHomeworkLink(e.target.value)}
          />
          <button onClick={handleAddHomeworkVideo}>Add Homework Video</button>
        </div>
        <h3>Existing Homework Videos</h3>
        <ul className={styles.subList}>
          {homeworkVideos.length > 0 ? (
            homeworkVideos.map((video) => (
              <li key={video.id}>
                <a
                  href={`https://odysee.com/$/embed/@${video.odyseeName}:${video.odyseeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {video.odyseeName}
                </a>
                <button onClick={() => handleDeleteHomeworkVideo(video.id)}>
                  Delete
                </button>
              </li>
            ))
          ) : (
            <li>No homework videos found.</li>
          )}
        </ul>
      </section>

      <hr />

      <section>
        <h2>Add Extra Links</h2>
        <div className={styles.form}>
          <input
            type="text"
            placeholder="Link Text"
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
          />
          <input
            type="text"
            placeholder="Link URL"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
          <button onClick={handleAddLink}>Add Link</button>
        </div>
        <h3>Existing Links</h3>
        <ul className={styles.subList}>
          {links.length > 0 ? (
            links.map((link) => (
              <li key={link.id}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.text}
                </a>
                <button
                  style={{ marginLeft: "0.5rem" }}
                  onClick={() => handleDeleteLink(link.id)}
                >
                  Delete
                </button>
              </li>
            ))
          ) : (
            <li>No extra links found.</li>
          )}
        </ul>
      </section>

      {showModal && (
        <MessageModal
          message={modalMessage}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
