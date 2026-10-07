import React from 'react';
import './Container.css';

interface ContainerProps {
  children: React.ReactNode;
  narrow?: boolean;
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  narrow = false,
  className = '',
}) => {
  return (
    <div className={`container ${narrow ? 'container-narrow' : ''} ${className}`}>
      {children}
    </div>
  );
};

export default Container;
