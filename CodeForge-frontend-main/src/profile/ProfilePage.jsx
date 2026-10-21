import { useEffect, useState } from "react";
import { UserRound, Trophy } from "lucide-react";
import { fetchMyProfile } from "../api/users";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyProfile()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen w-full pt-28 pb-16 px-6 sm:px-10" style={{ backgroundColor: "#FFE6C8" }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-[28px] font-bold mb-1" style={{ color: "#6A0D45" }}>
          Profile
        </h1>
        <p className="text-[14px] mb-6" style={{ color: "#7A6A62" }}>
          Your account and progress.
        </p>

        {isLoading && (
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#F0DCC0" }}>
            <LoadingSpinner label="Loading profile..." />
          </div>
        )}

        {!isLoading && error && <ErrorMessage message={error} />}

        {!isLoading && !error && profile && (
          <div className="bg-white rounded-xl overflow-hidden border" style={{ borderColor: "#F0DCC0" }}>
            <div className="flex items-center gap-4 px-6 py-6" style={{ borderBottom: "1px solid #F0DCC0" }}>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#FBF7F2" }}
              >
                <UserRound size={26} style={{ color: "#7F265C" }} />
              </div>
              <div>
                <p className="text-[16px] font-semibold" style={{ color: "#3A2E2A" }}>
                  {profile.username}
                </p>
                <p className="text-[13px]" style={{ color: "#9A8B82" }}>
                  {profile.email}
                </p>
              </div>
            </div>

            <div className="px-6 py-6 flex items-center gap-4">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(74,222,128,0.15)" }}
              >
                <Trophy size={20} style={{ color: "#4ADE80" }} />
              </div>
              <div>
                <p className="text-[22px] font-bold font-mono" style={{ color: "#3A2E2A" }}>
                  {profile.solved_count}
                </p>
                <p className="text-[13px]" style={{ color: "#9A8B82" }}>
                  Problems solved
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
