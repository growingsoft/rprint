import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import './Layout.css';

export const Layout: React.FC = () => {
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
          <Outlet />
        </div>
      </main>
    </div>
  );
};
