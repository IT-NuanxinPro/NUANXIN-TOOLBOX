import React from 'react';
import * as Icons from 'lucide-react';

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

export const Icon: React.FC<IconProps> = ({ name, className = '', size = 20 }) => {
  // Map string names to the exported Lucide React component
  const LucideIcon = (Icons as any)[name];
  
  if (!LucideIcon) {
    // Return a fallback search icon if not found
    return <Icons.HelpCircle className={className} size={size} />;
  }

  return <LucideIcon className={className} size={size} />;
};
