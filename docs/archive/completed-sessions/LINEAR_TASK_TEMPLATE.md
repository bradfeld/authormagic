# Linear Task: Google Books API Integration for Enhanced Book Coverage

## 📋 **Task Summary**

Add Google Books API as supplementary data source to solve ISBNDB coverage limitations and provide comprehensive book search results.

## 🎯 **Problem Statement**

Current ISBNDB API only returns 2 books for "Startup Life" while manual website search shows 8 books available. Users are missing access to complete binding and edition options.

## ✅ **Acceptance Criteria**

- [ ] "Startup Life" search returns 8 books (up from current 2)
- [ ] All binding types preserved (Hardcover, Paperback, Ebook, Audiobook)
- [ ] Edition grouping algorithm maintains integrity with merged data
- [ ] Performance remains acceptable with dual API calls
- [ ] Fallback behavior if one API source fails
- [ ] Production build passes all validations

## 🔧 **Technical Requirements**

### **Core Implementation**

- [ ] Create `GoogleBooksService` class following existing `ISBNDBService` pattern
- [ ] Implement title/author search methods for Google Books API
- [ ] Add result merging/deduplication logic in API route
- [ ] Maintain existing edition detection algorithm (proven robust)

### **API Integration**

- [ ] Google Books API key configuration
- [ ] Rate limiting and error handling
- [ ] Response format normalization to UIBook type
- [ ] Caching strategy for merged results

### **Data Quality**

- [ ] Deduplication logic for overlapping books from both sources
- [ ] Binding type normalization across different API formats
- [ ] Author name consistency handling
- [ ] ISBN validation and matching

## 📊 **Test Cases**

1. **"Startup Life" + Brad Feld**: Should return 8 books with proper bindings
2. **"Venture Deals" + Brad Feld**: Should maintain current 4 editions + additional coverage
3. **API Failure Scenarios**: Graceful degradation when one source fails
4. **Performance**: Response time under 2 seconds for dual API calls

## 🚀 **Current State Context**

- **Branch**: `feature/binding-preservation-algorithm`
- **Base Functionality**: Binding preservation algorithm ✅ COMPLETE
- **Repository**: https://github.com/bradfeld/authormagic.git
- **Development Server**: Running on localhost:3000

## 📁 **Files to Modify**

- `src/lib/services/google-books.service.ts` (NEW)
- `src/app/api/books/title-author/route.ts` (modify to use dual sources)
- `src/lib/constants/api-config.ts` (add Google Books config)
- Environment variables (Google Books API key)

## 🔗 **Dependencies**

- Google Books API access and key
- Current binding preservation algorithm (completed)
- Existing ISBNDB integration (maintain as primary source)

## 📝 **Notes**

- Estimated effort: 1-2 development sessions
- No production deployment until thoroughly tested
- Maintain backward compatibility with existing API responses
- Consider implementing as progressive enhancement (fallback to ISBNDB only)

## 🎯 **Success Metrics**

- Increase in total books returned for test searches
- User access to more binding/format options
- Improved data completeness without algorithm regression
- Stable performance with dual API architecture

---

**Priority**: High  
**Effort**: Medium (1-2 sessions)  
**Dependencies**: Google Books API setup  
**Assignee**: [Your name]  
**Epic**: Book Data Enhancement
