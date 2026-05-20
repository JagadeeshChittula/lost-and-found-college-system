function serializeUser(user) {
  if (!user) return null;
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    is_admin: Boolean(user.isAdmin),
    blocked: Boolean(user.blocked),
    muted: Boolean(user.muted)
  };
}

function serializeItem(item, user, firstClaim) {
  const ownerId = item.owner?._id ? item.owner._id.toString() : item.owner?.toString();
  const claimUserId = firstClaim?.claimer?._id
    ? firstClaim.claimer._id.toString()
    : firstClaim?.claimer?.toString();
  const userId = user?._id.toString();
  const isOwner = Boolean(userId && ownerId === userId);
  const hasClaim = Boolean(userId && claimUserId === userId);

  return {
    id: item._id.toString(),
    type: item.type,
    name: item.name,
    contact: item.contact,
    email: item.email || "",
    description: item.description || "",
    item_date: item.itemDate || "",
    owner_id: ownerId,
    owner_name: item.owner?.name || "",
    status: item.status,
    imageUrl: item.imageUrl || "",
    created_at: item.createdAt?.toISOString(),
    is_owner: isOwner,
    has_claim: hasClaim,
    can_chat: isOwner || hasClaim
  };
}

module.exports = { serializeUser, serializeItem };
