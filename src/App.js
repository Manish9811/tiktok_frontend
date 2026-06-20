import { useEffect, useRef, useState } from "react";

export default function App() {
  const [videos, setVideos] = useState([]);
  const [muted, setMuted] = useState(true);
  const videoRefs = useRef({});

  const handleVideoClick = async (id) => {
    const video = videoRefs.current[id];
    if (!video) return;
  
    // pause others first
    Object.keys(videoRefs.current).forEach((key) => {
      const v = videoRefs.current[key];
      if (v && Number(key) !== id) {
        v.pause();
      }
    });
  
    // wait for pause to settle
    await new Promise((r) => setTimeout(r, 50));
  
    // now safely toggle play
    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch (err) {
      console.log("play interrupted safely ignored");
    }
  };

  /* UPLOAD */
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const formData = new FormData();
    formData.append("video", file);
  
    try {
      const res = await fetch("https://tiktok-backend-eta.vercel.app/upload", {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json();
      console.log(data);
      
      // OPTIONAL: Add uploaded video to UI immediately if backend returns it
      // setVideos((prev) => [{ id: data.id, url: data.videoURL, publicId: data.publicId }, ...prev]);
  
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  /* FETCH VIDEOS (FIXED LOOP) */
  useEffect(() => {
    async function getData() {
      try {
        const fetchVideo = await fetch("https://tiktok-backend-eta.vercel.app/get-videos", {
          method: "GET",
        });

        const data = await fetchVideo.json();

        // FIX: Map the backend objects into a clean array and update state ONCE
        const formattedVideos = data.map((value) => ({
          id: value.id,
          url: value.videoURL,
          publicId: value.publicId,
        }));

        setVideos(formattedVideos);
      } catch (e) {
        console.error("Error occurred while fetching videos:", e);
      }
    }

    getData();
  }, []);

  /* TOGGLE MUTE */
  const toggleMute = () => {
    setMuted((prev) => !prev);
    Object.values(videoRefs.current).forEach((video) => {
      if (video) video.muted = !muted;
    });
  };

  /* AUTO APPLY MUTE TO NEW VIDEOS */
  useEffect(() => {
    Object.values(videoRefs.current).forEach((video) => {
      if (video) video.muted = muted;
    });
  }, [videos, muted]);

  /* DELETE VIDEO */
  const deleteVideo = async (id, publicId) => {
    const confirmation = window.confirm("Are you sure want to delete?");
    if (!confirmation) return;
    
    try {
      // Note: Make sure your backend expects id or publicId here
      await fetch(`https://tiktok-backend-eta.vercel.app/video/${publicId}`, {
        method: "DELETE",
      });
  
      // remove from UI instantly using unique backend id
      setVideos((prev) => prev.filter((v) => v.id !== id));
  
    } catch (err) {
      console.log("Delete error:", err);
    }
  };

  return (
    <div className="h-screen w-full bg-black flex justify-center">

      {/* Upload */}
      <div className="fixed top-4 right-4 z-50">
        <input
          type="file"
          accept="video/*"
          id="upload"
          className="hidden"
          onChange={handleUpload}
        />
        <label
          htmlFor="upload"
          className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold cursor-pointer"
        >
          Upload
        </label>
      </div>

      {/* Mute */}
      <button
        onClick={toggleMute}
        className="fixed top-4 left-4 z-50 bg-white text-black px-3 py-2 rounded-full text-sm"
      >
        {muted ? "🔇" : "🔊"}
      </button>

      {/* FEED */}
      <div className="h-screen w-full md:w-[40%] bg-black overflow-hidden border-x border-gray-800">
        <div className="h-screen overflow-y-scroll snap-y snap-mandatory">

          {videos && videos.map((video) => (
            <div
              key={video.id} // FIX: Changed from index to unique video.id
              className="h-screen w-full snap-start relative flex items-center justify-center"
              onClick={() => handleVideoClick(video.id)}
            >
              <video
                ref={(el) => { videoRefs.current[video.id] = el; }}
                src={video.url}
                className="h-full w-full object-cover"
                autoPlay
                loop
                muted={muted}
                playsInline
              />

              {/* Overlay */}
              <div className="absolute bottom-10 left-4 text-white">
                <p className="font-bold">@user</p>
                <p className="text-sm opacity-80">
                  Tap to play / pause • Swipe to scroll
                </p>
              </div>

              {/* Actions */}
              <div className="absolute right-4 bottom-20 flex flex-col gap-6 text-white items-center">
                <button onClick={(e) => e.stopPropagation()}>❤️</button>
                <button onClick={(e) => e.stopPropagation()}>💬</button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevents video play toggle when clicking delete
                    deleteVideo(video.id, video.publicId);
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}