# AuthorMagic Development Methodology

## Core Principles

### 1. **Investigation & Vision Phase**
- Investigate current codebase to understand context and constraints
- Ask clarifying questions about anything unclear
- Search codebase and external docs as needed
- Create vision document using standardized template
- No code until 95% alignment on vision achieved

### 2. **Breakdown Phase**
- Propose detailed plan with clear tasks/tickets
- Break multi-step tasks into clear sub-steps
- Refine with feedback until confirmed
- Do not proceed until breakdown is approved

### 3. **Ordering Phase**
- Propose execution order with testable checkpoints
- Explain why this order is optimal
- Wait for explicit sign-off on both order and checkpoints

### 4. **Implementation Phase**
- Work task by task, sub-step by sub-step
- Make small, incremental code changes
- After each change, pause and summarize what was done
- Always ask permission before moving to next step

## 🛡️ **Safety Checkpoint Protocol**

### **When to Create Safety Checkpoints**
- **Before each major phase** (Database migration, Authentication, etc.)
- **After completing critical infrastructure** (Working database, API endpoints)
- **Before high-risk operations** (User migration, production changes)
- **When switching between major feature areas**

### **Safety Checkpoint Process**
1. **Commit Current Work**
   ```bash
   git add .
   git commit -m "✅ [Phase Name] Complete: [Summary of accomplishments]"
   ```

2. **Create Descriptive Branch**
   ```bash
   git checkout -b [phase-name]-complete-stable
   ```

3. **Push to GitHub**
   ```bash
   git push -u origin [phase-name]-complete-stable
   ```

4. **Return to Main Branch**
   ```bash
   git checkout main
   git push origin main
   ```

### **Branch Naming Convention**
- `phase1-complete-stable` - After major phase completion
- `feature-[name]-stable` - After feature completion
- `migration-[type]-stable` - After data migrations
- `pre-[risky-operation]-stable` - Before high-risk changes

### **Rollback Strategy**
If issues arise:
```bash
git checkout [stable-branch-name]
git checkout -b fix-[issue-description]
# Fix issues or deploy from stable branch
```

## **Collaboration Rules**

1. **Follow Explicit Directions** - No assumptions
2. **Ask Questions** - If unclear, pause and ask
3. **Small Changes** - Incremental progress only
4. **Permission Gates** - Ask before proceeding to next step
5. **Safety First** - Create checkpoints before risky operations

## **Code Quality Standards**

- **KISS** (Keep It Simple, Stupid)
- **YAGNI** (You Aren't Gonna Need It)
- **SOLID** principles
- **Comments** explaining inputs, outputs, and functionality
- **Readability** optimized for developer understanding

## **Debugging Methodology**

1. **Identify Root Cause** - Don't treat symptoms
2. **Provide Code Evidence** - Snippets that prove the cause
3. **Search Codebase** - Look for additional context
4. **Multiple Hypotheses** - Consider different possible causes
5. **Evidence-Based Reasoning** - Which hypothesis fits the evidence
6. **Zoom Out** - If stuck, restate the problem from scratch

## **Time Tracking & Estimation**

- Track actual vs estimated time for accuracy improvement
- Document lessons learned for future estimation
- Note factors that made tasks faster/slower than expected
- Use historical data to improve future estimates

## **Risk Management**

- **High-risk tasks last** - After all dependencies proven
- **Incremental testing** - Validate at each checkpoint
- **Data safety** - Multiple backups before changes
- **Rollback plans** - Clear path back to working state

---

**This methodology ensures professional, safe, and efficient development while maintaining the ability to recover from any issues that arise.** 