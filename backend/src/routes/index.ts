import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';

// Import Controllers
import * as auth from '../controllers/auth.controller';
import * as couple from '../controllers/couple.controller';
import * as chat from '../controllers/chat.controller';
import * as vault from '../controllers/vault.controller';
import * as timeline from '../controllers/timeline.controller';
import * as goals from '../controllers/goals.controller';
import * as diary from '../controllers/diary.controller';
import * as games from '../controllers/games.controller';
import * as ai from '../controllers/ai.controller';

const router = Router();
const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } }); // limit 25MB

// --- MODULE 1: AUTHENTICATION ---
router.post('/auth/register', auth.register);
router.post('/auth/verify-otp', auth.verifyOtp);
router.post('/auth/login', auth.login);
router.post('/auth/forgot-password', auth.forgotPassword);
router.post('/auth/reset-password', auth.resetPassword);
router.put('/auth/profile', authenticate, auth.updateProfile);
router.post('/auth/keys', authenticate, auth.saveKeys);
router.get('/auth/me', authenticate, auth.getMe);

// --- MODULE 2: COUPLE PAIRING SYSTEM ---
router.post('/couple/generate-code', authenticate, couple.generatePairCode);
router.post('/couple/pair', authenticate, couple.pairWithCode);
router.post('/couple/unpair', authenticate, couple.unpair);

// --- MODULE 3 & 4: REAL-TIME CHAT & ENCRYPTION ---
router.get('/chat/messages', authenticate, chat.getMessages);
router.post('/chat/upload', authenticate, upload.single('file'), chat.uploadAttachment);
router.put('/chat/messages/:id/edit', authenticate, chat.editMessage);
router.put('/chat/messages/:id/pin', authenticate, chat.togglePinMessage);
router.delete('/chat/messages/:id/everyone', authenticate, chat.deleteMessageForEveryone);
router.delete('/chat/messages/:id/me', authenticate, chat.deleteMessageForMe);

// --- MODULE 7: MEMORY VAULT ---
router.get('/vault/memories', authenticate, vault.getMemories);
router.post('/vault/memories', authenticate, upload.single('file'), vault.createMemory);
router.delete('/vault/memories/:id', authenticate, vault.deleteMemory);
router.get('/vault/albums', authenticate, vault.getAlbums);

// --- MODULE 8: RELATIONSHIP TIMELINE ---
router.get('/timeline', authenticate, timeline.getTimelineEvents);
router.post('/timeline', authenticate, timeline.createTimelineEvent);
router.delete('/timeline/:id', authenticate, timeline.deleteTimelineEvent);

// --- MODULE 10: SHARED GOALS ---
router.get('/goals', authenticate, goals.getGoals);
router.post('/goals', authenticate, goals.createGoal);
router.put('/goals/:id/progress', authenticate, goals.updateGoalProgress);
router.delete('/goals/:id', authenticate, goals.deleteGoal);

// --- MODULE 11: SHARED DIARY ---
router.get('/diary', authenticate, diary.getDiaryEntries);
router.post('/diary', authenticate, diary.createDiaryEntry);
router.delete('/diary/:id', authenticate, diary.deleteDiaryEntry);

// --- MODULE 12: COUPLE GAMES ---
router.get('/games/truth-dare', authenticate, games.getTruthOrDare);
router.get('/games/spin-tasks', games.getSpinWheelTasks);
router.post('/games/spin-submit', authenticate, games.submitSpinResult);
router.get('/games/love-language/questions', games.getLoveLanguageQuestions);
router.post('/games/love-language/submit', authenticate, games.submitLoveLanguage);
router.post('/games/quiz/submit', authenticate, games.submitQuizAnswers);
router.get('/games/history', authenticate, games.getGameHistory);

// --- MODULE 13: AI FEATURES ---
router.post('/ai/chat', authenticate, ai.chatWithAdvisor);
router.get('/ai/date-planner', authenticate, ai.getPlanDates);
router.get('/ai/gift-recommender', authenticate, ai.getGiftIdeas);
router.get('/ai/conversation-starters', ai.getConversationStarters);
router.get('/ai/dashboard', authenticate, ai.getRelationshipDashboard);

export default router;
