import Repository from '../models/repository.js';
import PostModel from '../models/post.js';
import Controller from './Controller.js';

export default
    class PostsController extends Controller {
        constructor(HttpContext) {
            super(HttpContext, new Repository(new PostModel()));
        }

        // list() {
        //     this.HttpContext.response.JSON(
        //         this.repository.getAll(this.HttpContext.path.params, this.repository.ETag)
        //     );
        // }
    }