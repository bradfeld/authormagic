import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY']!,
});

export interface GenerateTextOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export async function generateText(
  prompt: string,
  options: GenerateTextOptions = {},
): Promise<string> {
  const {
    model = 'claude-3-sonnet-20240229',
    maxTokens = 1000,
    temperature = 0.7,
    systemPrompt,
  } = options;

  try {
    const messages: Anthropic.Messages.MessageParam[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const messageParams: Anthropic.Messages.MessageCreateParamsNonStreaming = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages,
    };

    // Only add system prompt if it exists
    if (systemPrompt) {
      messageParams.system = systemPrompt;
    }

    const response = await anthropic.messages.create(messageParams);

    const content = response.content[0];
    if (content && content.type === 'text') {
      return content.text;
    }

    throw new Error('Unexpected response format from Claude API');
  } catch (error) {
    // Re-throw error for proper handling by caller
    throw error;
  }
}

export async function generateMarketingContent(
  contentType:
    | 'social_post'
    | 'email'
    | 'blog_post'
    | 'press_release'
    | 'book_description',
  bookData: {
    title: string;
    author: string;
    genre: string;
    description?: string;
    targetAudience?: string;
  },
  additionalContext?: string,
) {
  const systemPrompt = `You are an expert book marketing copywriter. Create compelling, professional marketing content that drives engagement and sales. Focus on the book's unique value proposition and target audience.`;

  const contentPrompts = {
    social_post: `Create 3 engaging social media posts for the book "${bookData.title}" by ${bookData.author}. 
    Genre: ${bookData.genre}
    ${bookData.description ? `Description: ${bookData.description}` : ''}
    ${additionalContext ? `Additional context: ${additionalContext}` : ''}
    
    Make them shareable, include relevant hashtags, and vary the tone (professional, conversational, intriguing).`,

    email: `Write a compelling email campaign for "${bookData.title}" by ${bookData.author}.
    Genre: ${bookData.genre}
    ${bookData.description ? `Description: ${bookData.description}` : ''}
    ${additionalContext ? `Additional context: ${additionalContext}` : ''}
    
    Include: Subject line, engaging opening, book benefits, call-to-action, and professional closing.`,

    blog_post: `Create a blog post outline and introduction for "${bookData.title}" by ${bookData.author}.
    Genre: ${bookData.genre}
    ${bookData.description ? `Description: ${bookData.description}` : ''}
    ${additionalContext ? `Additional context: ${additionalContext}` : ''}
    
    Focus on providing value to readers while naturally promoting the book.`,

    press_release: `Write a professional press release for "${bookData.title}" by ${bookData.author}.
    Genre: ${bookData.genre}
    ${bookData.description ? `Description: ${bookData.description}` : ''}
    ${additionalContext ? `Additional context: ${additionalContext}` : ''}
    
    Include newsworthy angle, author credentials, and media contact information.`,

    book_description: `Create an optimized book description for "${bookData.title}" by ${bookData.author}.
    Genre: ${bookData.genre}
    ${bookData.description ? `Current description: ${bookData.description}` : ''}
    ${additionalContext ? `Additional context: ${additionalContext}` : ''}
    
    Make it compelling, SEO-friendly, and conversion-focused for online retailers.`,
  };

  return await generateText(contentPrompts[contentType], {
    systemPrompt,
    temperature: 0.8,
  });
}

export async function analyzeBookPerformance(salesData: unknown[]) {
  const systemPrompt = `You are a book marketing analytics expert. Analyze sales data and provide actionable insights for improving book performance and marketing strategies.`;

  const prompt = `Analyze the following book sales data and provide insights:
  ${JSON.stringify(salesData, null, 2)}
  
  Please provide:
  1. Performance trends and patterns
  2. Platform comparison and recommendations
  3. Marketing effectiveness analysis
  4. Actionable recommendations for improvement
  5. Revenue optimization strategies
  
  Format the response in clear sections with specific, actionable advice.`;

  return await generateText(prompt, { systemPrompt });
}

export async function generateAuthorWebsite(authorData: {
  name: string;
  bio: string;
  books: Array<{ title: string; description: string; genre: string }>;
  genre: string;
  website_url?: string;
}) {
  const systemPrompt = `You are an expert web copywriter specializing in author websites. Create compelling, professional content that showcases the author's brand and drives book sales.`;

  const prompt = `Create professional website content for author ${authorData.name}:
  
  Author Bio: ${authorData.bio}
  Primary Genre: ${authorData.genre}
  Books: ${authorData.books.map(book => `"${book.title}" (${book.genre}): ${book.description}`).join('\n')}
  
  Generate:
  1. Hero section headline and tagline
  2. About section content (engaging bio expansion)
  3. Book showcase descriptions
  4. Contact page content
  5. SEO meta description
  6. Call-to-action suggestions
  
  Make it professional, engaging, and conversion-focused.`;

  return await generateText(prompt, { systemPrompt });
}
