/**
 * Test fixtures for video processing integration tests
 */

export const mockVideoInfo = {
  withTranscript: {
    id: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
    description: 'The official video for "Never Gonna Give You Up" by Rick Astley',
    duration: 212,
    channelTitle: 'Rick Astley',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  tutorial: {
    id: '5HAKUIvYo-Q',
    title: 'Best NextJS Folder Structures | Beginner - Intermediate - Advanced',
    description: 'Learn the best folder structures for Next.js applications',
    duration: 1847,
    channelTitle: 'Code with Antonio',
    thumbnailUrl: 'https://i.ytimg.com/vi/5HAKUIvYo-Q/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=5HAKUIvYo-Q'
  },
  noTranscript: {
    id: 'testVideoId',
    title: 'Advanced React Patterns - No Transcript Available',
    description: 'Advanced patterns in React development including custom hooks, context patterns, and performance optimization',
    duration: 3600,
    channelTitle: 'React Mastery',
    thumbnailUrl: 'https://i.ytimg.com/vi/testVideoId/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=testVideoId'
  },
  shortVideo: {
    id: 'shortTest',
    title: 'Quick CSS Tip',
    description: 'A quick tip about CSS flexbox',
    duration: 45,
    channelTitle: 'CSS Tips',
    thumbnailUrl: 'https://i.ytimg.com/vi/shortTest/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=shortTest'
  },
  longVideo: {
    id: 'longTest',
    title: 'Complete Full-Stack Development Course',
    description: 'A comprehensive course covering frontend, backend, and deployment',
    duration: 28800, // 8 hours
    channelTitle: 'Full Stack Academy',
    thumbnailUrl: 'https://i.ytimg.com/vi/longTest/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=longTest'
  }
};

export const mockTranscriptData = {
  withTranscript: [
    {
      text: 'Welcome to this comprehensive tutorial on Next.js folder structures.',
      start: 0,
      duration: 4.5
    },
    {
      text: 'Today we\'ll cover beginner, intermediate, and advanced patterns.',
      start: 4.5,
      duration: 3.8
    },
    {
      text: 'Let\'s start with the basic folder structure that every Next.js project needs.',
      start: 8.3,
      duration: 4.2
    },
    {
      text: 'The pages directory is where your routes are defined.',
      start: 12.5,
      duration: 3.5
    },
    {
      text: 'For more complex applications, you might want to consider feature-based organization.',
      start: 16,
      duration: 4.8
    }
  ],
  empty: []
};

export const expectedAIAnalysisResults = {
  withTranscript: {
    success: true,
    keyframeIntervals: [
      { timestamp: 0, reason: 'Introduction and overview', confidence: 0.95, category: 'intro' as const },
      { timestamp: 30, reason: 'Basic folder structure explanation', confidence: 0.9, category: 'main_point' as const },
      { timestamp: 120, reason: 'Intermediate patterns', confidence: 0.85, category: 'main_point' as const },
      { timestamp: 240, reason: 'Advanced patterns', confidence: 0.8, category: 'main_point' as const },
      { timestamp: 360, reason: 'Best practices and conclusion', confidence: 0.9, category: 'conclusion' as const }
    ],
    summary: {
      summary: 'This tutorial covers Next.js folder structures from beginner to advanced levels, including basic organization, feature-based structures, and advanced patterns for large applications.',
      keyPoints: [
        'Basic Next.js project structure',
        'Pages directory organization',
        'Feature-based folder organization',
        'Advanced patterns for scalability'
      ],
      topics: ['Next.js', 'Folder Structure', 'Project Organization', 'Best Practices'],
      difficulty: 'intermediate' as const,
      estimatedReadTime: 5
    },
    tags: ['nextjs', 'folder-structure', 'organization', 'best-practices', 'tutorial'],
    categories: ['Web Development', 'React', 'Next.js']
  },
  noTranscript: {
    success: true,
    keyframeIntervals: [
      { timestamp: 0, reason: 'Video introduction', confidence: 0.7, category: 'intro' as const },
      { timestamp: 540, reason: 'First major concept (~15%)', confidence: 0.65, category: 'main_point' as const },
      { timestamp: 1080, reason: 'Mid-point content (~30%)', confidence: 0.6, category: 'main_point' as const },
      { timestamp: 1800, reason: 'Core content (~50%)', confidence: 0.7, category: 'main_point' as const },
      { timestamp: 2520, reason: 'Advanced topics (~70%)', confidence: 0.65, category: 'main_point' as const },
      { timestamp: 3240, reason: 'Conclusion and summary (~90%)', confidence: 0.8, category: 'conclusion' as const }
    ],
    summary: {
      summary: 'This video covers advanced React patterns including custom hooks, context patterns, and performance optimization techniques for building scalable React applications.',
      keyPoints: [
        'Advanced React patterns overview',
        'Custom hooks implementation',
        'Context API patterns',
        'Performance optimization techniques'
      ],
      topics: ['React', 'Advanced Patterns', 'Performance', 'Custom Hooks', 'Context API'],
      difficulty: 'advanced' as const,
      estimatedReadTime: 8
    },
    tags: ['react', 'advanced-patterns', 'performance', 'custom-hooks', 'context-api'],
    categories: ['Web Development', 'React', 'Advanced Programming']
  }
};

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User'
};

export const invalidYouTubeUrls = [
  'https://example.com/video',
  'not-a-url',
  'https://vimeo.com/123456',
  'https://youtube.com', // No video ID
  '', // Empty string
  'https://www.youtube.com/watch?v=', // Empty video ID
];

export const validYouTubeUrls = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLExample'
];