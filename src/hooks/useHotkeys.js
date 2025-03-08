import { useEffect } from 'react';

export default function useHotkeys(bindings) {
  useEffect(() => {
    const handleKeyPress = (e) => {
      for (const [keys, callback] of bindings) {
        const [modifier, key] = keys.toLowerCase().split('+');
        const isCtrlOrCmd = (e.ctrlKey || e.metaKey) && modifier === 'ctrl';
        
        if (isCtrlOrCmd && e.key.toLowerCase() === key) {
          e.preventDefault();
          callback(e);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [bindings]);
} 