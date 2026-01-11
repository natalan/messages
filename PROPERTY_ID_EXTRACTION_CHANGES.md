# Property ID Extraction Changes

## Summary

Fixed VRBO property ID extraction to correctly identify properties from VRBO emails. The "Vrbo #4353572" in the subject line is now correctly extracted as the **property ID** (not platform thread ID).

## Changes Made

### 1. **VRBO Normalizer** (`src/services/normalizers/vrbo.js`)

#### Added `extractPropertyId` method
- Extracts VRBO property ID from subject line: `"Vrbo #4353572"`
- Pattern: `"Reservation from [Name]: [Dates] - Vrbo #4353572"`
- Returns: `"4353572"` (the property ID)

#### Fixed `extractPlatformThreadId` method
- **Before**: Extracted "Vrbo #4353572" as platform_thread_id (incorrect)
- **After**: Returns `null` (VRBO emails don't have a separate thread ID)
- Thread grouping is handled by `external_thread_id` (Gmail thread ID)

### 2. **Normalization Service** (`src/services/normalize.js`)

#### Added property ID extraction from platform emails
- Checks if normalizer has `extractPropertyId` method
- Extracts property ID from email if not provided in payload
- Uses extracted property ID as fallback: `payload.property_id || extractedPropertyId || null`

**Priority order for property_id:**
1. Function parameter `property_id` (if provided)
2. `payload.property_id` (from webhook)
3. Extracted property ID from email (new)
4. `null` (if none available)

## Impact

### ✅ **Correct Property Attribution**

**Before:**
- `property_id: null` ❌
- `platform_thread_id: "4353572"` (incorrect - this is a property ID, not thread ID)

**After:**
- `property_id: "4353572"` ✅ (correctly extracted from email)
- `platform_thread_id: null` ✅ (correct - VRBO doesn't have thread IDs in emails)

### ✅ **Enables Property-Aware Features**

With property_id correctly set:
- ✅ Knowledge items can be retrieved by property (`GET /properties/:property_id/knowledge`)
- ✅ Messages can be grouped by property
- ✅ Property context can be associated with messages
- ✅ Reply suggestions can use property-specific context in LLM prompts

### ✅ **Property Identification**

For VRBO emails, the system now correctly identifies:
- **Property ID**: Extracted from "Vrbo #4353572" → `"4353572"`
- This is the VRBO platform-specific property identifier
- Can be mapped to other identifiers (uplisting ID, Airbnb ID, etc.) in future enhancements

## Files Changed

1. `src/services/normalizers/vrbo.js`
   - Added `extractPropertyId()` method
   - Fixed `extractPlatformThreadId()` to return null

2. `src/services/normalize.js`
   - Added property ID extraction logic
   - Updated property_id resolution to use extracted ID as fallback

## Testing

All existing tests should continue to pass. The changes are:
- **Backward compatible**: If `payload.property_id` is provided, it takes precedence
- **Additive**: Extracts property ID only if not provided in payload
- **Platform-specific**: Only VRBO normalizer currently extracts property ID

## Next Steps (Optional Enhancements)

1. **Airbnb Property ID Extraction**: Add similar logic to Airbnb normalizer if needed
2. **Multiple Property Identifiers**: Support mapping VRBO ID → Uplisting ID → Airbnb ID
3. **Property Name Extraction**: Extract property name from emails if available
4. **Tests**: Add tests for property ID extraction from VRBO emails
