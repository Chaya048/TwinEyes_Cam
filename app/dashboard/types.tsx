// types.ts
  export type Message = {
    role: 'user' | 'ai';
    content: string;
  };
  
  export type LogEntry = {
    time: string;
    event: string;
  };
  
  export type CapturedImage = {
    id: number;
    cam: string;
    url: string;
  };
