import React from "react";
import "./likes.scss";
import { useLocation } from "react-router-dom";
import { useQuery } from "react-query";
import { makeRequest } from "../../axios";
const Likes = () => {
  const photoId = parseInt(useLocation().pathname.split("/")[2]);
  const { isLoading, error, data } = useQuery(["/postLikes"], () =>
    makeRequest.get("/postLikes?photoId=" + photoId).then((res) => {
      return res.data.rows;
    })
  );

  console.log(data);

  return (
    <div className="likes">
      <div className="users">
        {isLoading
          ? "loading.."
          : data.map((user) => (
              <div className="comment" key={user.username}>
                <span>{user.username}</span>
              </div>
            ))}
      </div>
    </div>
  );
};

export default Likes;