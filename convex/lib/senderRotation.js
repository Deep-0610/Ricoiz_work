function rotateSender(pool, leadId) {
  if (pool.length === 0) throw new Error("Empty sender pool");
  const hash = leadId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return pool[hash % pool.length];
}
export {
  rotateSender
};
