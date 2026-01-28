import React from 'react';
import { Link } from 'react-router-dom';
import { FaMagic, FaHistory, FaEdit, FaSignInAlt, FaUserPlus, FaArrowRight } from 'react-icons/fa';
import ChefHatIcon from './ChefHatIcon';
import '../styles/LandingPage.css';

const LandingPage = ({ onTryDemo }) => {
  return (
    <div className="landing-page">
      <div className="landing-hero">
        <ChefHatIcon size={80} className="hero-icon" />
        <h1 className="hero-title">RecipeLab</h1>
        <p className="hero-subtitle">
          Turn your ingredients into culinary masterpieces. Generate custom recipes, modify them to your taste, and build your digital cookbook instantly.
        </p>
        
        <div className="landing-cta">
          <Link to="/signup" className="cta-btn cta-primary">
            <FaUserPlus /> Get Started Free
          </Link>
          <button onClick={onTryDemo} className="cta-btn cta-secondary">
            <FaMagic /> Try Features
          </button>
        </div>
        
        <Link to="/login" className="cta-text">
          Already have an account? Sign In
        </Link>
      </div>

      <div className="landing-features" style={{ display: 'none' }}>
      </div>
    </div>
  );
};

export default LandingPage;
