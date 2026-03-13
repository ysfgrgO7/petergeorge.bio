import React from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaGraduationCap,
  FaSchool,
} from "react-icons/fa";
import styles from "../dashboard.module.css";
import { UserProfile } from "@/lib/types";

export default function StudentProfileCard({
  studentInfo,
}: {
  studentInfo: UserProfile | null;
}) {
  if (!studentInfo) return null;

  const info = [
    {
      item: "Full Name",
      value: `${studentInfo.firstName} ${studentInfo.secondName} ${studentInfo.thirdName} ${studentInfo.forthName}`,
      icon: FaUser,
    },
    {
      item: "Year",
      value: studentInfo.year,
      icon: FaGraduationCap,
    },
    {
      item: "Email",
      value: studentInfo.email,
      icon: FaEnvelope,
    },
    {
      item: "Phone",
      value: studentInfo.studentPhone,
      icon: FaPhone,
    },
    {
      item: "System",
      value: studentInfo.system,
      icon: FaSchool,
    },
  ];

  return (
    <div className={styles.infoCard}>
      <div>
        <div
          style={{
            marginBottom: "var(--spacing-lg)",
            borderBottom: "2px solid var(--blue)",
          }}
          className={styles.titleWithIcon}
        >
          <FaUser color="var(--blue)" />
          <h2>Student Profile</h2>
        </div>
        <div className={styles.infoList}>
          {info.map((detail, index) => {
            const Icon = detail.icon;
            return (
              <div key={index} className={styles.infoEntry}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Icon color="var(--light)" />
                  <strong>{detail.item}:</strong>
                </div>
                <span>{detail.value}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className={styles.qrWrapper}>
        <QRCodeSVG value={studentInfo.studentCode} size={200} level="H" />
        <small>{studentInfo.studentCode}</small>
      </div>
    </div>
  );
}
