import { eslintCompatPlugin } from "@oxlint/plugins";

import { noCommentNoiseRule } from "./no-comment-noise.ts";

export default eslintCompatPlugin({
    meta: { name: "comment-policy" },
    rules: { "no-comment-noise": noCommentNoiseRule },
});
