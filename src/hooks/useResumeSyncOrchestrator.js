import { useCallback, useRef } from "react";
import { getResumeContentHash, saveResumeSectionsBatch } from "../services/resumeBuilderApi";

/**
 * Strict Imperative Orchestrator Hook
 * Ensures that the projection table (resume_full_documents) is ONLY ever updated through a single,
 * protected entry point, eliminating effect-driven Read/Write Storms.
 */
export function useResumeSyncOrchestrator({
  resumeId,
  userId,
  getLatestResumeData,
  setProjectionStatus,
  setProjectionMessage,
  setLatestProjectedVersion,
}) {
  const isSyncingRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const lastProjectedHashRef = useRef("");
  const latestProjectedVersionRef = useRef(null);

  // Called ONLY by initPage when we verify a read-model already exists.
  const setInitialHash = useCallback((hash, version = null) => {
    lastProjectedHashRef.current = hash;
    if (version !== null) {
      latestProjectedVersionRef.current = version;
    }
  }, []);

  const executeSync = async (reason) => {
    if (!resumeId || !userId) return false;

    if (isSyncingRef.current) {
      console.log(`[SyncOrchestrator] 🛑 BLOCKED (Mutex locked). Reason: ${reason}`);
      return false; // Safely abort since a sync is already running
    }

    const { resumeData, customSections } = getLatestResumeData();
    const currentHash = getResumeContentHash(resumeData, customSections);

    if (currentHash === lastProjectedHashRef.current) {
      console.log(`[SyncOrchestrator] 🛑 NO-OP (Hash matches). Reason: ${reason}`);
      setProjectionStatus?.("up_to_date");
      setProjectionMessage?.("Preview is up to date.");
      return true; // Resolves as successful because state is correct
    }

    try {
      isSyncingRef.current = true;
      setProjectionStatus?.("updating");
      setProjectionMessage?.("Updating preview...");

      
      // Perform the actual API projection step without regenerating fragments
      const result = await saveResumeSectionsBatch({
        sectionKeys: [], // Only trigger projection, fragmented saves happened earlier
        resumeId,
        userId,
        resumeData,
        customSections,
        regenerateReadModel: true,
        version: latestProjectedVersionRef.current !== null ? latestProjectedVersionRef.current + 1 : undefined,
      });
      
      if (result?.version) {
        setLatestProjectedVersion?.(result.version);
        latestProjectedVersionRef.current = result.version;
        lastProjectedHashRef.current = currentHash;

      }

      setProjectionStatus?.("up_to_date");
      setProjectionMessage?.("Preview is up to date.");
      return true;
    } catch (e) {
      console.error(`[SyncOrchestrator] ❌ FAILED. Reason: ${reason}`, e);
      setProjectionStatus?.("error");
      setProjectionMessage?.("Failed to update preview.");
      return false;
    } finally {
      isSyncingRef.current = false;
    }
  };

  const requestSync = useCallback((reason, options = { immediate: false }) => {

    
    // Always clear the existing debounce timer if a new request comes in
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (options.immediate) {
      return executeSync(reason);
    }

    return new Promise((resolve) => {
      debounceTimerRef.current = setTimeout(async () => {
        const success = await executeSync(reason);
        resolve(success);
      }, 15000); // 15s debounce for idle editing syncs
    });
  }, [resumeId, userId, getLatestResumeData, setProjectionStatus, setProjectionMessage, setLatestProjectedVersion]);

  return { requestSync, setInitialHash };
}
