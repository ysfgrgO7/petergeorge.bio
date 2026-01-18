import React from 'react';
import styles from './Loading.module.css';

interface LoadingProps {
  text?: string;
  showSpinner?: boolean;
}

const Loading: React.FC<LoadingProps> = ({
  text = "Loading...",
  showSpinner = true
}) => {
  return (
    <div className={styles.loadingContainer}>
      {showSpinner && <div className={styles.spinner}></div>}
      <p className={styles.loadingText}>{text}</p>
    </div>
  );
};

export default Loading;
