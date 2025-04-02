export interface User {
  id: number;
  username: string;
  postCount: number;
  avatarUrl: string;
}

interface Post {
  id: number;
  userid: number;
  content: string;
}

const generateAvatarUrl = (userId: number) => {
  const randomSeed = userId + Math.floor(Math.random() * 1000);
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`;
};

async function getUsers() {
  const res = await fetch(`${process.env.ENDPOINT}users`, {
    next: { revalidate: 1800 },
    headers: {
      Authorization: `Bearer ${process.env.API_SECRET_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch users");
  }

  const usersObject = await res.json();
  //error checking incase the return is invalid
  if (!usersObject.users || typeof usersObject.users !== "object") {
    throw new Error("Invalid API response format: Missing 'users' object");
  }
  //converting to a iteratabel array might not be the best aproach
  return Object.entries(usersObject.users).map(([id, username]) => ({
    id: Number(id),
    username: username as string,
  }));
}

async function getPostsForUser(userId: number) {
  const res = await fetch(`${process.env.ENDPOINT}users/${userId}/posts`, {
    next: { revalidate: 1800 },
    headers: {
      Authorization: `Bearer ${process.env.API_SECRET_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    return { posts: [] };
  }

  return res.json();
}

export default async function TopUsers() {
  try {
    const users = await getUsers();
    const userPostCounts: User[] = [];

    for (const user of users) {
      const userData = await getPostsForUser(user.id);
      const posts = userData.posts || [];

      userPostCounts.push({
        id: user.id,
        username: user.username,
        postCount: posts.length,
        avatarUrl: generateAvatarUrl(user.id),
      });
    }

    const topUsers = userPostCounts
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 5);

    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800">Top Users</h1>
            <p className="mt-2 text-gray-600">
              Users with the highest number of posts
            </p>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow-lg">
            <div className="bg-blue-500 px-6 py-4 text-white">
              <h2 className="text-xl font-semibold">Top 5 Contributors</h2>
            </div>

            <ul className="divide-y divide-gray-200">
              {topUsers.map((user, index) => (
                <li
                  key={user.id}
                  className="p-6 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-blue-500 bg-gray-200">
                        <img
                          src={user.avatarUrl}
                          alt={`${user.username}'s avatar`}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                          {index + 1}
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">
                          @{user.username}
                        </h3>
                        <div className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-800">
                          {user.postCount} posts
                        </div>
                      </div>
                      <p className="mt-1 text-gray-500">User ID: {user.id}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          <p className="font-bold">Error</p>
          <p>
            {error instanceof Error
              ? error.message
              : "An unknown error occurred"}
          </p>
        </div>
      </div>
    );
  }
}
