import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../components/common/Container';
import Button from '../components/common/Button';
import './AuthPages.css';

interface PlaceholderPageProps {
  title: string;
  icon: string;
  description: string;
  milestone: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  icon,
  description,
  milestone,
}) => {
  return (
    <div className="placeholder-wrap">
      <Container>
        <div className="placeholder-card glass-panel">
          <div className="placeholder-icon">{icon}</div>
          <span className="placeholder-badge">{milestone}</span>
          <h2>{title}</h2>
          <p>{description}</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/">
              <Button variant="secondary" size="md">
                Home
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="md">
                Pre-Register
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default PlaceholderPage;
