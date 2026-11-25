import pool from "../config/database.js";

export const getSessions = async () => {
  const { rows } = await pool.query(`
    SELECT thread_id,
           COUNT(*) AS checkpoint_count,
           MAX(checkpoint_id) AS latest_checkpoint
    FROM public.checkpoints
    GROUP BY thread_id
    ORDER BY MAX(checkpoint_id) DESC
    LIMIT 30
  `);

  return {
    status: "connected",
    sessions: rows.map((row) => ({
      id: row.thread_id,
      checkpointCount: Number(row.checkpoint_count),
      latestCheckpoint: row.latest_checkpoint,
    })),
  };
};
