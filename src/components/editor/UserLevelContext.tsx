'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type UserLevel = 'simple' | 'medium' | 'advanced';

interface UserLevelContextType {
  userLevel: UserLevel;
  setUserLevel: (level: UserLevel) => void;
  isSimple: boolean;
  isMedium: boolean;
  isAdvanced: boolean;
  showAdvancedFields: boolean;
  showCodeEditor: boolean;
  showYamlExport: boolean;
  showDebugTools: boolean;
}

const UserLevelContext = createContext<UserLevelContextType | null>(null);

export function UserLevelProvider({ children }: { children: ReactNode }) {
  const [userLevel, setUserLevelState] = useState<UserLevel>('medium');

  const setUserLevel = useCallback((level: UserLevel) => {
    setUserLevelState(level);
  }, []);

  const value: UserLevelContextType = {
    userLevel,
    setUserLevel,
    isSimple: userLevel === 'simple',
    isMedium: userLevel === 'medium',
    isAdvanced: userLevel === 'advanced',
    showAdvancedFields: userLevel === 'medium' || userLevel === 'advanced',
    showCodeEditor: userLevel === 'advanced',
    showYamlExport: userLevel === 'advanced',
    showDebugTools: userLevel === 'advanced',
  };

  return (
    <UserLevelContext.Provider value={value}>
      {children}
    </UserLevelContext.Provider>
  );
}

export function useUserLevel() {
  const context = useContext(UserLevelContext);
  if (!context) {
    throw new Error('useUserLevel must be used within a UserLevelProvider');
  }
  return context;
}

export type { UserLevel };
