"use client";

import { useState, useEffect } from "react";
import { User } from "../top/page";

interface Post {
  id: number;
  userid: number;
  content: string;
  username?: string;
  commentCount: number;
  imageUrl?: string;
}

interface Comment {
  id: number;
  postid: number;
  content: string;
}

export default function TrendingPosts() {
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // gettin random image fors the post
  const generatePostImage = () => {
    return " https://picsum.photos/seed/picsum/300/200";
  };

  useEffect(() => {
    const fetchTrendingPosts = async () => {
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
        const users: User[] = await res.json();

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

        const postsWithCommentCounts = await Promise.all(
          allPosts.map(async (post) => {
            try {
              const commentsResponse = await fetch(
                `${process.env.NEXT_PUBLIC_ENDPOINT}/posts/${post.id}/comments`,
              );
              if (!commentsResponse.ok) return { ...post, commentCount: 0 };

              const commentsData = await commentsResponse.json();
              const comments = commentsData.comments || [];

              return {
                ...post,
                username: userMap.get(post.userid) || "Unknown User",
                commentCount: comments.length,
                imageUrl: generatePostImage(),
              };
            } catch (err) {
              return { ...post, commentCount: 0 };
            }
          }),
        );

        const maxCommentCount = Math.max(
          ...postsWithCommentCounts.map((post) => post.commentCount),
          0,
        );

        const trending = postsWithCommentCounts
          .filter(
            (post) =>
              post.commentCount === maxCommentCount && post.commentCount > 0,
          )
          .sort((a, b) => b.id - a.id);

        setTrendingPosts(trending);
        setLoading(false);
      } catch (err) {
        //sonner maybe if time
        setError(
          err instanceof Error ? err.message : "An unknown error occurred",
        );
        setLoading(false);
      }
    };

    fetchTrendingPosts();
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

  if (trendingPosts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="mb-4 text-3xl font-bold text-gray-800">
            Trending Posts
          </h1>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-gray-600">No posts with comments found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">Trending Posts</h1>
          <p className="mt-2 text-gray-600">
            Posts with the most comments ({trendingPosts[0].commentCount})
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {trendingPosts.map((post) => (
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
                  <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                    {post.commentCount} comments
                  </div>
                  <div className="ml-auto text-sm text-gray-500">
                    Post #{post.id}
                  </div>
                </div>

                <p className="mb-4 text-lg text-gray-700">{post.content}</p>

                <div className="mt-4 flex items-center border-t border-gray-200 pt-4">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      @{post.username}
                    </p>
                    <p className="text-gray-500">User ID: {post.userid}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
