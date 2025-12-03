# Quick Reference: Multiple-Choice Questions

## 📝 All 35 Questions

### Screen 1: Openness, Extraversion, Conscientiousness
1. How do you usually approach new experiences? (4 options)
2. When plans change suddenly, how do you feel? (4 options)
3. How do you recharge after a long day? (4 options)
4. In social situations, you usually: (4 options)
5. Which describes your social energy? (4 options)
6. How organized are you day-to-day? (4 options)
7. How often do you procrastinate? (4 options)

### Screen 2: Problem-Solving, Planning, Creativity
8. When solving problems, you prefer: (4 options)
9. Do you plan everything or improvise? (4 options)
10. How important is perfection to you? (4 options)
11. When working on a project, you: (4 options)
12. Do you enjoy exploring new ideas, cultures, or perspectives? (4 options)
13. Do you enjoy abstract thinking or philosophical discussions? (4 options)
14. How often do you daydream? (4 options)

### Screen 3: Emotional Responses & Stress
15. When stressed, you usually: (5 options)
16. What hurts you the most? (5 options)
17. How intense are your emotions? (4 options)
18. When something goes wrong, you: (4 options)
19. What instantly makes you angry or upset? (5 options)
20. How often do you experience anxiety, anger, or sadness? (4 options)
21. When overwhelmed, what do you usually do? (5 options)

### Screen 4: Decision-Making & Motivation
22. When making big decisions, you rely on: (4 options)
23. Do you decide quickly or slowly? (4 options)
24. Are you comfortable deciding without full information? (4 options)
25. What motivates you more? (5 options)
26. What matters most in life right now? (5 options)
27. What drives you more? (5 options)

### Screen 5: Relationships, Trust, Fears
28. In relationships, you are: (4 options)
29. When someone hurts you, you: (4 options)
30. Do you naturally trust people? (4 options)
31. What do you fear losing the most? (5 options)
32. What do people misunderstand about you the most? (5 options)
33. **What is a weakness you rarely talk about?** _(Open-ended text)_
34. What behavior from others hurts you the most? (5 options)
35. In relationships, do you fear: (4 options)

---

## 🔑 Key Points

- **34 Multiple Choice** + **1 Open-Ended**
- All have **"Other" option** (except Q33)
- **7 questions per screen** for good UX
- Takes ~3-5 minutes to complete
- AI analyzes both selected options AND "Other" text

---

## 🗄️ Database Field Names

```sql
question_type: 'single_choice' | 'text'
options_json: ["Option 1", "Option 2", ...] (JSONB array)
screen_number: 1-5
allow_other: true/false
```

---

## 📁 Files Changed

✅ `database/schema.sql` - Added new columns  
✅ `database/seed_questions.sql` - 35 questions with options  
✅ `database/migration_to_multiple_choice.sql` - Migration script  
✅ `web/src/app/onboarding/page.tsx` - Radio button UI  
✅ `web/src/lib/types.ts` - TypeScript types  
✅ `backend/src/routes/personality.routes.js` - API updates  
✅ `mobile/lib/screens/onboarding_screen.dart` - Flutter UI  

---

**Ready to test!** 🎉
