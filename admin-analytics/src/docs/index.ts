import type { DocArticle } from './types';
import { feedbackEmailsArticle } from './articles/feedbackEmails';
import { dailyStatsRevampArticle } from './articles/dailyStatsRevamp';

// Un article par feature — le plus récent en premier.
export const docArticles: DocArticle[] = [dailyStatsRevampArticle, feedbackEmailsArticle];
