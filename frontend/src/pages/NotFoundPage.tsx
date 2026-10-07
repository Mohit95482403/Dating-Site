import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../components/common/Container';
import Button from '../components/common/Button';
import './AuthPages.css';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="placeholder-wrap">
      <Container>
        <div className="placeholder-card glass-panel">
          <div className="placeholder-icon">💔</div>
          <span className="placeholder-badge">404 Error</span>
          <h2>Lost in the Crowd?</h2>
          <p>
            The page you are looking for doesn't exist or has moved. Let's get you back to meeting great people.
          </p>
          <Link to="/">
            <Button variant="primary" size="md">
              Return to Connectly Home
            </Button>
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default NotFoundPage;
