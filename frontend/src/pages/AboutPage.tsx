import React from 'react';
import Container from '../components/common/Container';
import SectionTitle from '../components/common/SectionTitle';
import Button from '../components/common/Button';
import { Link } from 'react-router-dom';
import './AuthPages.css';

export const AboutPage: React.FC = () => {
  return (
    <div className="info-page-wrap">
      <Container narrow>
        <div className="info-hero">
          <SectionTitle
            badge="About Connectly"
            title="Building Meaningful Social Chemistry"
            subtitle="Connectly was founded on a simple premise: people connect best when they celebrate what actually makes them unique."
          />
        </div>

        <div className="info-content-card glass-panel">
          <h3>The Vision</h3>
          <p>
            Modern dating culture has turned into a numbers game characterized by superficial swiping and ghosting. Connectly reintroduces humanity to social discovery. By combining personality markers, shared hobbies, and synchronous real-time chat, we help members start conversations that actually matter.
          </p>
        </div>

        <div className="info-content-card glass-panel">
          <h3>Production Engineering</h3>
          <p>
            Connectly is engineered with a battle-tested stack: a high-speed React 19 & TypeScript frontend with Vite, modular Express.js APIs, a resilient MySQL transactional database, and bi-directional Socket.IO web sockets for instantaneous messaging.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/register">
            <Button variant="primary" size="lg">
              Get Started with Connectly
            </Button>
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default AboutPage;
