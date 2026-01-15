import React, { useState } from 'react';
import { Navigation } from './Navigation';
import './Layout.css';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="layout">
      <Navigation
        isCollapsed={isCollapsed}
        toggleCollapse={toggleCollapse}
      />
      <main className="main-content">
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
};
