"use client";

import { useState, useEffect } from "react";

interface Post {
  id: number;
  userid: number;
  content: string;
  username?: string;
  imageUrl?: string;
}

interface User {
  id: number;
  username: string;
}

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const generatePostImage = () => {
    return " https://picsum.photos/seed/picsum/300/200";
  };

  useEffect(() => {
    const fetchAllPosts = async () => {
      try {
        setLoading(true);

        const res = await fetch(`${process.env.NEXT_PUBLIC_ENDPOINT}users`, {
          next: { revalidate: 1800 },
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) throw new Error("Failed to fetch users");
        const usersData = await res.json();

        if (!usersData.users || typeof usersData.users !== "object") {
          throw new Error("Invalid API formaat");
        }

        const users: User[] = Object.entries(usersData.users).map(
          ([id, username]) => ({
            id: Number(id),
            username: username as string,
          }),
        );

        const userMap = new Map();
        users.forEach((user) => {
          userMap.set(user.id, user.username);
        });

        const allPostsPromises = [];
        for (const user of users) {
          allPostsPromises.push(
            fetch(`${process.env.NEXT_PUBLIC_ENDPOINT}users/${user.id}/posts`)
              .then((res) => (res.ok ? res.json() : { posts: [] }))
              .then((data) => data.posts || [])
              .catch(() => []),
          );
        }

        const allPostsResponses = await Promise.all(allPostsPromises);
        const allPosts = allPostsResponses.flat().filter(Boolean);

        const enrichedPosts = allPosts.map((post) => ({
          ...post,
          username: userMap.get(post.userid) || "Unknown User",
          imageUrl: generatePostImage(),
        }));

        const sortedPosts = enrichedPosts.sort((a, b) => b.id - a.id);

        setPosts(sortedPosts);
        setLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred",
        );
        setLoading(false);
      }
    };

    fetchAllPosts();

    const pollInterval = setInterval(fetchAllPosts, 10000);

    return () => clearInterval(pollInterval);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">Feed</h1>
          <p className="mt-2 text-gray-600">Latest posts from all users</p>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-lg bg-white p-6 text-center shadow">
            <p className="text-gray-600">No posts available.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="overflow-hidden rounded-lg bg-white shadow-lg"
              >
                <img
                  src={post.imageUrl}
                  alt={`Post image ${post.id}`}
                  className="h-48 w-full object-cover"
                />

                <div className="p-6">
                  <div className="mb-4 flex items-center">
                    <div className="font-medium text-blue-600">
                      @{post.username}
                    </div>
                    <div className="ml-auto text-sm text-gray-500">
                      Post #{post.id}
                    </div>
                  </div>

                  <p className="text-gray-700">{post.content}</p>

                  <div className="mt-4 flex items-center border-t border-gray-200 pt-4">
                    <div className="text-sm">
                      <p className="text-gray-500">User ID: {post.userid}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
