# Bugs & TODOs

## 🐛 Current Bugs

### 1. Integration Test Database Cleanup Issues
**Status**: Open  
**Priority**: Medium  
**Description**: Some tables like `category` still contain data after integration test cleanup  
**Files**: Integration test setup/teardown  
**Impact**: Test isolation compromised, potential false positives/negatives  

### 2. Video Processing UX State Management Bug
**Status**: Open  
**Priority**: High  
**Description**: UX for video processing has issues with state changes - status updates not reflecting correctly in UI  
**Files**: `src/modules/video/ui/views/VideoProcessingView.tsx`  
**Impact**: Users see incorrect processing status, poor UX  

### 3. Video Processing Test Failure
**Status**: Open  
**Priority**: High  
**Description**: `video-processing.test` is failing  
**Files**: `integration_tests/video-processing.test.ts` or similar  
**Impact**: CI/CD pipeline potentially broken, test coverage gaps  

## 📋 TODO Items

### 4. Add Playwright End-to-End Tests
**Status**: Open  
**Priority**: Medium  
**Description**: Implement Playwright tests for critical user workflows  
**Scope**: 
- Video URL submission flow
- Processing status monitoring
- Library browsing
- Error scenarios
**Benefits**: Better coverage of user journeys, catch UI regressions  

### 5. Add MCP Tools for Development
**Status**: Open  
**Priority**: Low  
**Description**: Add Model Context Protocol tools for Playwright and database to help LLM investigate bugs more efficiently  
**Scope**:
- MCP Playwright integration for browser automation
- MCP database tools for direct DB investigation
**Benefits**: Faster debugging, automated issue investigation  

## 📝 Notes

- Integration test cleanup should ensure complete database reset between tests
- Video processing UX issues may be related to SSE connection handling or state management
- Consider adding test utilities for common database operations
- Playwright tests should cover both happy path and error scenarios
- MCP tools would significantly improve debugging workflow for AI-assisted development