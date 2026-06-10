export const CHUNK_SIZE = 1200;
export const SAFE_CHUNK_DISTANCE = 4;
export const HARSH_CHUNK_DISTANCE = 5;
export const DANGEROUS_CHUNK_DISTANCE = 10;
export const MAX_CHUNK_DISTANCE = 15;
export const WORLD_SIZE = CHUNK_SIZE * MAX_CHUNK_DISTANCE * 2;
export const SAVE_KEY = "wayborn-save-v1";
export const RENDER_RESOLUTION = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);

export const MAX_RAFT_COLUMNS = 12;
export const MAX_RAFT_ROWS = 4;
export const RAFT_MIN_X = -Math.floor(MAX_RAFT_COLUMNS / 2);
export const RAFT_MAX_X = RAFT_MIN_X + MAX_RAFT_COLUMNS - 1;
export const RAFT_MIN_Y = -Math.floor(MAX_RAFT_ROWS / 2);
export const RAFT_MAX_Y = RAFT_MIN_Y + MAX_RAFT_ROWS - 1;
