/* eslint-disable max-len */
export default function getLoaderHtml(url: string) {
  return (`
    <!doctype html>
    <html>
    <head>
      <title>Loading...</title>
      <meta charset="utf-8">
      <style>
        @-webkit-keyframes spin {
          0% {  -webkit-transform: rotate(0); }
          100% { -webkit-transform: rotate(360deg); }
        }
        @keyframes spin {
          0% { -webkit-transform: rotate(0); transform: rotate(0); }
          100% { -webkit-transform: rotate(360deg); transform: rotate(360deg); }
        }
        .spinner {
          position: absolute;
          top: 50%;
          left: 50%;
          margin: -32px;
          width: 64px;
          height: 64px;
          -webkit-animation: spin 1s linear infinite;
          animation: spin 1s linear infinite;
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
        }
        .spinner path {
          fill: none;
          stroke: #e1e1e1;
          stroke-width: 1;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-miterlimit: 10;
          stroke-opacity: 1;
        }
        .spinner .path2 { stroke: #0084ff;}
      </style>
    </head>
    <body>
      <svg 
        class="spinner"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        preserveAspectRatio="xMidYMin slice"
        >
        <path 
          class="path1"
          d="M32,0.501c-17.369,0-31.5,14.131-31.5,31.5s14.131,31.5,31.5,31.5s31.5-14.131,31.5-31.5S49.369,0.501,32,0.501 z"
        />
        <path 
          class="path2"
          d="M32,0.501c-17.369,0-31.5,14.131-31.5,31.5"
        />
      </svg>
      <script>location.href = '${url}';</script>
    </body>
    </html>
  `);
}