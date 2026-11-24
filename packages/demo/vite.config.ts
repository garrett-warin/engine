import { viteStaticCopy } from "vite-plugin-static-copy";

export default {
	plugins: [
		viteStaticCopy({
			structured: false,
			targets: [
				{
					src: "node_modules/@mercuryworkshop/grove/dist/*",
					dest: "grove",
				},
				{
					src: "node_modules/@mercuryworkshop/grove-controller/dist/*",
					dest: "controller",
				},
			],
			watch: {
				reloadPageOnChange: true,
			},
		}),
	],
};
