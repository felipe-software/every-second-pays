import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";

const ROUTINE_TASK = "engagement-notification-routine";
const CHECK_EVERY_MINUTES = 60;

// Must run at startup, before any screen: a background launch never mounts the app.
TaskManager.defineTask(ROUTINE_TASK, async () => {
    try {
        const { runRoutine } = await import("./runner");
        await runRoutine();
        return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
        return BackgroundTask.BackgroundTaskResult.Failed;
    }
});

export async function registerRoutineTask() {
    await BackgroundTask.registerTaskAsync(ROUTINE_TASK, { minimumInterval: CHECK_EVERY_MINUTES });
}
