export type ToolCategory = 'image' | 'dev' | 'test' | 'ops';

export type UserRole = 'developer' | 'tester' | 'designer' | 'ops';

export interface ToolRegistryItem {
  id: string;
  title: string;
  description: string;
  category: ToolCategory;
  keywords: string[];
  roles: UserRole[];
  privacy: 'local' | 'cloud';
  icon: string; // Lucide icon name
}

export interface ToolComponentProps {
  onRecordUsage: () => void;
}
